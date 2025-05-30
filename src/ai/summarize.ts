import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import * as fs from "fs";
import * as core from "@actions/core";
import { getMemory } from "./memory";
import { getToken } from "../octokit";

const CONTENT_RE = RegExp(/{{.*CONTENT>.*}}/);

function loadPrompt(input: string): string {
  const promptFileOrInput = core.getInput(input);

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

    const endpoint = "https://models.inference.ai.azure.com";

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
  memoryBank: number = 0,
): Promise<string> {
  const prompt = loadPrompt(promptInput);

  const memory = getMemory();
  const content = memory.getBankContent(memoryBank);

  const hydratedPrompt = prompt.replace(CONTENT_RE, content);
  const output = await runPrompt(hydratedPrompt);

  return output;
}
