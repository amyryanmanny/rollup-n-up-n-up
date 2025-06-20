export { stripHtml, toSnakeCase } from "@util/string";

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
