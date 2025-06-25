// TODO: This file needs a refactor, it's pretty confusing
import fs from "fs";

import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import { summary } from "@actions/core";
import { SUMMARY_ENV_VAR } from "@actions/core/lib/summary";
import { context } from "@actions/github";

import { getConfig } from "@config";
import { getToken } from "@util/octokit";

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant summarizing GitHub Discussions, Issues, and Comments into a concise rollup for less technical audiences.";
const DEFAULT_MODEL_NAME = "openai/gpt-4.1";
const DEFAULT_MAX_TOKENS = 800;

export type PromptParameters = {
  prompt: string;
  systemPrompt?: string;
  modelName?: string;
  maxTokens?: string | number;
};

function getEndpoint(tokenKind: string): string {
  const customEndpoint = getConfig("MODEL_ENDPOINT") || "";
  if (customEndpoint !== "") {
    return customEndpoint;
  }

  switch (tokenKind) {
    case "app":
      // Apps must use the org-specific endpoint. Assume the current org
      return `https://models.github.ai/orgs/${context.repo.owner}/inference`;
    case "pat":
    case "default":
      // Default endpoint for PAT or default token
      return "https://models.github.ai/inference";
    default:
      throw new Error(`Unknown token kind: ${tokenKind}`);
  }
}

function loadPrompt(input: string): string {
  const promptFileOrInput = getConfig(input);

  if (promptFileOrInput === undefined || promptFileOrInput === "") {
    throw new Error(`Prompt input "${input}" was requested but not provided.`);
  }
  if (fs.existsSync(promptFileOrInput)) {
    return fs.readFileSync(promptFileOrInput, "utf-8");
  }
  return promptFileOrInput;
}

export async function runPrompt(params: PromptParameters): Promise<string> {
  const { prompt, systemPrompt, modelName, maxTokens } = {
    prompt: params.prompt,
    systemPrompt: params.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    modelName: params.modelName || DEFAULT_MODEL_NAME,
    maxTokens: Number(params.maxTokens) || DEFAULT_MAX_TOKENS,
  };

  try {
    if (modelName.startsWith("xai/")) {
      throw new Error("xai models are not supported");
    }

    const token = await getToken();

    const endpoint = getEndpoint(token.kind);

    // TODO: Detailed debug info MODEL_NAME, etc. Prepare for Datadog
    const client = ModelClient(endpoint, new AzureKeyCredential(token.value), {
      userAgentOptions: { userAgentPrefix: "github-actions-rollup-n-up" },
    });

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        model: modelName,
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

    const modelResponse: string | null =
      response.body.choices[0].message.content;

    return modelResponse ?? "No response from model";
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      return `ERROR: ${error.message}`;
    } else {
      return "An unexpected error occurred";
    }
  }
}

export async function summarize(
  promptInput: string,
  content: string,
): Promise<string> {
  const prompt = loadPrompt(promptInput);

  const contentMarker = RegExp(/\{\{\s*CONTENT\s*\}\}/);
  // TODO: Use systemPrompt instead of hydrating
  const hydratedPrompt = prompt.replace(contentMarker, content);

  if (SUMMARY_ENV_VAR in process.env) {
    // If running on a GitHub Action, log the prompt for debugging
    summary.addDetails("Hydrated Prompt (Debug)", hydratedPrompt).write();
  } else {
    console.debug(`Hydrated Prompt:\n${hydratedPrompt}`);
  }

  const output = await runPrompt({
    prompt: hydratedPrompt,
    // TODO: Concat the system prompt with the default one
    systemPrompt: getConfig("SYSTEM_PROMPT"),
    modelName: getConfig("MODEL_NAME"),
    maxTokens: getConfig("MAX_TOKENS"),
  });

  return output;
}
