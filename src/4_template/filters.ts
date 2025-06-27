import { runPrompt } from "@transform/ai/summarize";

export { stripHtml, toSnakeCase, title } from "@util/string";

export function accessible(markdown: string): string {
  // Inject accessibility features into the markdown

  // Color-blind friendly emojis
  const colorMap: Record<string, string> = {
    "🔴": "red",
    "🟥": "red",
    "🟠": "orange",
    "🟧": "orange",
    "🟡": "yellow",
    "🟨": "yellow",
    "🟢": "green",
    "🟩": "green",
    "🔵": "blue",
    "🟦": "blue",
    "🟣": "purple",
    "🟪": "purple",
    "🟤": "brown",
    "⚪️": "white",
    "⬜️": "white",
    "⚫️": "black",
    "⬛️": "black",
  };

  const emojiRegex = new RegExp(Object.keys(colorMap).join("|"), "g");
  markdown = markdown.replace(
    emojiRegex,
    (emoji) => `${emoji} (${colorMap[emoji]})`,
  );

  // TODO: Add more accessibility features here as needed

  return markdown;
}

export function stripToSentence(markdown: string): string {
  // Strip the markdown by replacing newlines and hyphens with spaces
  return markdown.replace(/[\s-]+/g, " ").trim();
}

export async function summarizeToSentence(markdown: string): Promise<string> {
  // Summarize the markdown to a single sentence
  if (!markdown.trim().includes("\n")) {
    // If the markdown is already a single sentence, return it as is
    return markdown.trim();
  }
  return await runPrompt({
    prompt: markdown,
    systemPrompt:
      "Summarize the following content into a single sentence. Try to sacrifice as little meaning as possible.",
    modelName: "openai/gpt-4.1-mini", // Use a lighter model for this task
    maxTokens: 100,
  });
}
