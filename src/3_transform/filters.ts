import { generateSummary } from "@transform/ai/summarize";

// Exports
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

  return markdown;
}

export function stripHeaders(markdown: string): string {
  // Replace headers by converting them to bolded text
  return markdown
    .replace(
      /^(#{1,6})\s+(.*)$/gm,
      (match, hashes, headerText) => `**${headerText}**`,
    )
    .trim();
}

export function stripFormatting(markdown: string): string {
  // Strip the markdown by removing markdown-specific syntax
  return markdown
    .replace(/[#*_~`>]/g, "") // Remove markdown symbols like #, *, _, ~, `, >
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
    .replace(/\[.*?\]\(.*?\)/g, "") // Remove links
    .replace(/[-+*]\s+/g, "") // Remove list markers
    .replace(/[\s]+/g, " ") // Replace multiple spaces with a single space
    .trim();
}

export async function summarize(
  markdown: string,
  promptFilePath: string,
): Promise<string> {
  return await generateSummary({
    prompt: promptFilePath,
    content: markdown,
  });
}

export async function summarizeToSentence(markdown: string): Promise<string> {
  if (!markdown.trim().includes("\n")) {
    // If the markdown is already a single sentence, return as is
    return markdown.trim();
  }

  return await generateSummary({
    prompt: {
      name: "Summarize to Sentence",
      model: "openai/gpt-4.1-mini", // Use a lighter model for this task
      messages: [
        {
          role: "system",
          content: `Summarize the following content into a single sentence.
            Try to sacrifice as little meaning as possible.
            Remove images and other embedded content.`,
        },
        { role: "user", content: markdown },
      ],
    },
    content: markdown,
    truncateTokens: 2000,
  });
}
