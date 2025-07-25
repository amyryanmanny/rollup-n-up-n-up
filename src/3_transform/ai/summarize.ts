import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import { getConfig, getModelEndpoint, loadPromptFile } from "@config";
import { getToken } from "@util/octokit";

import { type MemoryBank } from "@transform/memory";

import { SummaryCache } from "./cache";
import { insertPlaceholders } from "./hydration";
import { countTokens, truncate } from "./tokens";

export type Message = {
  role: "system" | "user" | "assistant" | "developer";
  content: string;
};

export type PromptParameters = {
  name?: string;
  description?: string;
  model: string;
  modelParameters?: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    // Most models are different, so need to handle unknown parameters too
    [key: string]: string | number | boolean | undefined;
  };
  messages: Array<Message>;
};

export async function runPrompt(params: PromptParameters): Promise<string> {
  const { messages, model, modelParameters } = {
    messages: params.messages,
    model: params.model,
    modelParameters: params.modelParameters || {},
  };

  // Validate inputs
  if (!messages.find((msg) => msg.role === "user")) {
    throw new Error("No user message found in the prompt.");
  }

  if (model.startsWith("xai/")) {
    throw new Error("xai models are not supported");
  }

  const truncateTokens = getConfig("TRUNCATE_TOKENS");
  if (truncateTokens !== undefined) {
    truncate(model, messages, Number(truncateTokens));
  }

  const totalTokens = countTokens(model, messages);
  if (totalTokens !== undefined) {
    console.log("Total tokens used:", totalTokens);
  }

  // TODO: Replace Markdown image tags by image_url messages

  // Finally call the Models API
  const token = await getToken();
  const endpoint = getModelEndpoint(token.kind);

  try {
    // TODO: Detailed debug info MODEL_NAME, etc. Prepare for Datadog
    const client = ModelClient(endpoint, new AzureKeyCredential(token.value), {
      apiVersion: "2024-12-01-preview", // For o1 support
      userAgentOptions: { userAgentPrefix: "github-actions-rollup-n-up-n-up" },
    });

    const response = await client.path("/chat/completions").post({
      body: {
        ...modelParameters,
        model,
        messages,
      },
    });

    if (isUnexpected(response)) {
      if (response.body.error) {
        throw response.body.error;
      }
      throw new Error(
        `An error occurred while fetching the response (${response.status}) ${response.body}`,
      );
    }

    const modelResponse = response.body.choices[0].message.content;
    if (!modelResponse) {
      throw new Error("No response from model.");
    } else if (modelResponse.startsWith("ERROR:")) {
      // Throw so errors don't get cached, or end up in the body
      throw new Error(modelResponse);
      // TODO: Exponential backoff for (429) Too Many Requests
    }

    return modelResponse;
  } catch (error: unknown) {
    throw new Error(`Unexpected Error: ${JSON.stringify(error)}`);
  }
}

type SummaryParameters = {
  content: string | MemoryBank;
  prompt: string | PromptParameters;
  query?: string;
};

export async function generateSummary(
  params: SummaryParameters,
): Promise<string> {
  let { content, prompt } = params;

  if (typeof prompt === "string") {
    // Try to load the prompt file if a string is provided
    if (!prompt || prompt.trim() === "") {
      throw new Error("prompt cannot be empty.");
    }
    prompt = loadPromptFile(prompt);
  }

  if (typeof content === "string") {
    // Convert string literal to MemoryBank format
    content = [{ content, source: content }] as MemoryBank;
  }

  // Check for a cache hit to avoid unnecessary generations
  const summaryCache = SummaryCache.getInstance();
  const cachedResponse = summaryCache.get(
    prompt,
    content.map((item) => item.source),
  );
  if (cachedResponse) {
    console.log("Using cached response for prompt:", prompt.name);
    return cachedResponse;
  }

  const input = content.map((item) => item.content).join("\n\n");

  const summary = await runPrompt(
    insertPlaceholders(prompt, {
      input,
      content: input,
      query: params.query || "",
    }),
  );

  // Save the summary in the cache
  summaryCache.set(
    prompt,
    content.map((item) => item.source),
    summary,
  );

  return summary;
}
