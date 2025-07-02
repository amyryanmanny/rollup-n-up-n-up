import fs from "fs";
import path from "path";
import yaml from "yaml";

import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import { getConfig, getModelEndpoint } from "@config";
import { getToken } from "@util/octokit";
import { insertPlaceholders } from "./placeholders";

const DEFAULT_SYSTEM_PROMPT =
  "You are an assistant summarizing structured GitHub Issues, Comments, and Discussions into a concise rollup for leadership, including less technical audiences.";
const DEFAULT_MODEL = "openai/gpt-4.1";
const DEFAULT_MAX_TOKENS = 4096;

export type PromptParameters = {
  name?: string;
  description?: string;
  model?: string;
  modelParameters?: {
    temperature?: number;
    [key: string]: string | number | boolean | undefined;
  };
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;

  // Non-standard API
  maxTokens?: string | number;
};

function loadPromptFile(promptFilePath: string): PromptParameters {
  if (!promptFilePath.includes(".")) {
    // If no file extension is provided, assume it's a .prompt.yaml file
    promptFilePath += ".prompt.yaml";
  }

  const directories = [
    "", // Absolute path
    ".github/prompts",
    ".github/Prompts",
    "prompts",
    "Prompts",
  ];

  let yamlBlob: string | undefined;
  for (const directory of directories) {
    const fullPath = path.join(directory, promptFilePath);
    if (fs.existsSync(fullPath)) {
      yamlBlob = fs.readFileSync(fullPath, "utf-8");
    }
  }

  if (yamlBlob === undefined) {
    throw new Error(`Prompt file "${promptFilePath}" does not exist.`);
  } else if (yamlBlob.trim() === "") {
    throw new Error(`Prompt file "${promptFilePath}" is empty.`);
  }

  // Parse YAML
  return yaml.parse(yamlBlob) as PromptParameters;
}

export async function runPrompt(params: PromptParameters): Promise<string> {
  const { messages, model, modelParameters, maxTokens } = {
    messages: params.messages,
    model: params.model || getConfig("MODEL") || DEFAULT_MODEL,
    modelParameters: params.modelParameters || {},
    maxTokens: Number(params.maxTokens) || DEFAULT_MAX_TOKENS,
  };

  console.log(`model: ${model}`);

  // Validate inputs
  if (!messages.find((msg) => msg.role === "system")) {
    messages.unshift({
      role: "system",
      content: getConfig("SYSTEM_PROMPT") || DEFAULT_SYSTEM_PROMPT,
    });
  }

  if (!messages.find((msg) => msg.role === "user")) {
    throw new Error("No user message found in the prompt.");
  }

  if (model.startsWith("xai/")) {
    throw new Error("xai models are not supported");
  }

  // Finally call the Models API
  try {
    const token = await getToken();
    const endpoint = getModelEndpoint(token.kind);

    // TODO: Detailed debug info MODEL_NAME, etc. Prepare for Datadog
    const client = ModelClient(endpoint, new AzureKeyCredential(token.value), {
      userAgentOptions: { userAgentPrefix: "github-actions-rollup-n-up-n-up" },
    });

    const response = await client.path("/chat/completions").post({
      body: {
        ...modelParameters,
        model,
        messages,
        max_tokens: maxTokens,
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
    }
    return modelResponse;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error: ${error.message}`);
    } else {
      throw new Error(`Unexpected Error: ${error}`);
    }
  }
}

export async function summarize(
  content: string,
  promptFilePath: string,
): Promise<string> {
  const prompt = loadPromptFile(promptFilePath);
  const summary = await runPrompt(
    insertPlaceholders(prompt, {
      input: content,
    }),
  );
  return summary;
}
