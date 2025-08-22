import "tiktoken/tiktoken_bg.wasm";

import fs from "fs";
import path from "path";

import { walk } from "@nodelib/fs.walk/promises";

import {
  encoding_for_model,
  init,
  Tiktoken,
  type TiktokenModel,
} from "tiktoken/init";
import type { Message } from "./summarize";

async function initWasm() {
  // Because of this bug https://github.com/oven-sh/bun/issues/4216
  for (const file of await walk(
    "/home/runner/work/_actions/amyryanmanny/rollup-n-up-n-up/tiktoken-wasm",
  )) {
    console.log(file.path);
  }
  for (const candidate of [import.meta.dirname, "node_modules/tiktoken"]) {
    const wasmPath = path.join(candidate, "tiktoken_bg.wasm");
    if (fs.existsSync(wasmPath)) {
      const wasm = await fs.promises.readFile(wasmPath);
      await init((imports) => WebAssembly.instantiate(wasm, imports));
      return;
    }
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
  githubModelName: string,
  messages: Array<Message>,
  maxTokens: number,
) {
  const encoding = getEncoding(githubModelName);
  if (!encoding) return;

  // Only truncate the user message
  const userMessage = messages.find((msg) => msg.role === "user");
  if (!userMessage) return;

  const rest = messages.filter((msg) => msg.role !== "user");

  const usedTokens = countTokens(githubModelName, rest)!;
  const remainingTokens = maxTokens - usedTokens;

  const userMessageTokens = encoding.encode(userMessage.content);
  const userMessageIndex = messages.indexOf(userMessage);

  if (userMessageTokens.length > remainingTokens) {
    // Replace the user message content with truncated content
    messages[userMessageIndex].content = new TextDecoder().decode(
      encoding.decode(userMessageTokens.slice(0, remainingTokens)),
    );
  }
}

await initWasm();
