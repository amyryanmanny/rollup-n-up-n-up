import fs from "fs";

import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import { getInput, summary } from "@actions/core";
import { SUMMARY_ENV_VAR } from "@actions/core/lib/summary";

import { getToken } from "../../octokit";

function loadPrompt(input: string): string {
  const promptFileOrInput = getInput(input);

  if (promptFileOrInput === undefined || promptFileOrInput === "") {
    throw new Error(`Prompt input "${input}" was requested but not provided.`);
  }
  if (fs.existsSync(promptFileOrInput)) {
    return fs.readFileSync(promptFileOrInput, "utf-8");
  }
  return promptFileOrInput;
}

async function runPrompt(prompt: string): Promise<string> {
  try {
    // Load system prompt with default value
    const systemPrompt =
      "You are a helpful assistant summarizing Issues and Comments into a concise rollup.";

    const modelName: string = "gpt-4.1";
    const maxTokens: number = 800;

    const token = await getToken();

    const endpoint = "https://models.github.ai/inference";

    const client = ModelClient(endpoint, new AzureKeyCredential(token), {
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
  const hydratedPrompt = prompt.replace(contentMarker, content);

  if (SUMMARY_ENV_VAR in process.env) {
    // If running on a GitHub Action, log the prompt for debugging
    summary.addDetails(`Hydrated Prompt`, hydratedPrompt).write();
  } else {
    console.debug(`Hydrated Prompt:\n${hydratedPrompt}`);
  }

  const output = await runPrompt(hydratedPrompt);

  return output;
}
