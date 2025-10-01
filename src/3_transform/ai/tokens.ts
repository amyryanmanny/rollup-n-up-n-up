import "tiktoken/tiktoken_bg.wasm"; // So Bun knows to bundle it as an asset
// TODO: There is a way to use the path directly from the import, but Typescript rejects it

import fs from "fs";
import { cloneDeep } from "lodash";

import { getAssetPath, isGitHubAction } from "@config";

import {
  encoding_for_model,
  init,
  Tiktoken,
  type TiktokenModel,
} from "tiktoken/init";

import type { Message, PromptParameters } from "./summarize";

async function initWasm() {
  // Because of this bug https://github.com/oven-sh/bun/issues/4216
  let wasmPath: string;
  if (isGitHubAction()) {
    wasmPath = getAssetPath("render", "tiktoken_bg.wasm");
  } else {
    // Locally we can just use the version in node_modules
    wasmPath = require.resolve("tiktoken/tiktoken_bg.wasm");
  }

  if (fs.existsSync(wasmPath)) {
    const wasm = await fs.promises.readFile(wasmPath);
    await init((imports) => WebAssembly.instantiate(wasm, imports));
    return;
  }

  throw new Error("Missing tiktoken_bg.wasm");
}

function getEncoding(githubModelName: string): Tiktoken | undefined {
  const modelName = githubModelName.split("/").pop();
  if (!modelName) {
    return undefined;
  }
  try {
    return encoding_for_model(modelName as TiktokenModel);
  } catch (error: unknown) {
    // Don't throw if Tiktoken doesn't support the model yet, let Models throw instead
    console.error(`Failed to count tokens for model ${githubModelName}`, error);
  }
}

export function countTokens(
  githubModelName: string,
  messages: Array<Message>,
): number | undefined {
  const encoding = getEncoding(githubModelName);
  if (!encoding) return undefined;

  const totalTokens = messages.reduce((sum, msg) => {
    return sum + encoding.encode(msg.content).length;
  }, 0);
  return totalTokens;
}

export function truncate(
  params: PromptParameters,
  maxTokens: number,
): PromptParameters {
  params = cloneDeep(params); // Avoid mutating the original params

  const encoding = getEncoding(params.model);
  if (!encoding) return params;

  // Only truncate the user message
  const userMessages = params.messages.filter((msg) => msg.role === "user");

  if (userMessages.length === 0) return params;
  if (userMessages.length > 1) {
    // TODO: Handle multiple user messages
    throw new Error("Multiple user messages not supported for truncation");
  }

  const userMessage = userMessages[0]!;

  const rest = params.messages.filter((msg) => msg.role !== "user");
  const usedTokens = countTokens(params.model, rest)!;
  const remainingTokens = maxTokens - usedTokens;

  const userMessageTokens = encoding.encode(userMessage.content);

  if (userMessageTokens.length > remainingTokens) {
    userMessage.content = new TextDecoder().decode(
      encoding.decode(userMessageTokens.slice(0, remainingTokens)),
    );
  }

  return params;
}

await initWasm();
