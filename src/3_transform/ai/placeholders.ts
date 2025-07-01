import type { PromptParameters } from "./summarize";

export function insertPlaceholders(
  params: PromptParameters,
  placeholders: Record<string, string>,
): PromptParameters {
  // Format the placeholders into the messages
  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `{{\\s*${key}\\s*}}`;
    const regex = new RegExp(placeholder, "gi"); // Case insensitive
    params.messages.forEach((msg) => {
      msg.content = msg.content.replace(regex, value);
    });
  }
  return params;
}
