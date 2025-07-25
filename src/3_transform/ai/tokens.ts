import {
  encoding_for_model,
  Tiktoken,
  type TiktokenModel,
} from "@dqbd/tiktoken";
import type { Message } from "./summarize";

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
