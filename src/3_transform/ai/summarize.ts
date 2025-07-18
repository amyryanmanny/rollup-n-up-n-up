import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import { getModelEndpoint, loadPromptFile } from "@config";
import { getToken } from "@util/octokit";
import { insertPlaceholders } from "./placeholders";

import { SummaryCache } from "./cache";

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
  messages: Array<{
    role: "system" | "user" | "assistant" | "developer";
    content: string;
  }>;
};

export async function runPrompt(params: PromptParameters): Promise<string> {
  const summaryCache = SummaryCache.getInstance();
  const cachedResponse = summaryCache.get(params);
  if (cachedResponse) {
    console.log("Using cached response for prompt:", params.name);
    return cachedResponse;
  }

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

  // TODO: Count tokens
  // import { encoding_for_model, TiktokenModel } from "@dqbd/tiktoken";

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

    summaryCache.set(params, modelResponse);

    return modelResponse;
  } catch (error: unknown) {
    throw new Error(`Unexpected Error: ${JSON.stringify(error)}`);
  }
}

export async function summarize(
  content: string,
  promptFilePath: string,
): Promise<string> {
  if (!content || content.trim() === "") {
    throw new Error("content cannot be empty.");
  }

  if (!promptFilePath || promptFilePath.trim() === "") {
    throw new Error("promptFilePath cannot be empty.");
  }

  const prompt = loadPromptFile(promptFilePath);
  const summary = await runPrompt(
    insertPlaceholders(prompt, {
      input: content, // Try 'input' as well since it's common in prompts
      content,
    }),
  );
  return summary;
}

export async function query(
  content: string,
  query: string,
  promptFilePath: string,
): Promise<string> {
  if (!content || content.trim() === "") {
    throw new Error("content cannot be empty.");
  }

  if (!promptFilePath || promptFilePath.trim() === "") {
    throw new Error("promptFilePath cannot be empty.");
  }

  const prompt = loadPromptFile(promptFilePath);
  const response = await runPrompt(
    insertPlaceholders(prompt, {
      input: content,
      content,
      query,
    }),
  );
  return response;
}
