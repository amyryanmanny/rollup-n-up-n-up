export const EMOJI_PRIORITY = [
  "🔴",
  "🟥",
  "🟠",
  "🟧",
  "🟡",
  "🟨",
  "🟢",
  "🟩",
  "🔵",
  "🟦",
  "🟣",
  "🟪",
  "🟤",
  "🟫",
  "⚪️",
  "⬜️",
  "⚫️",
  "⬛️",
];

export function emojiCompare(a: string, b: string): 1 | -1 | undefined {
  for (const emoji of EMOJI_PRIORITY) {
    if (a.includes(emoji) && !b.includes(emoji)) {
      return -1; // a comes before b
    }
    if (!a.includes(emoji) && b.includes(emoji)) {
      return 1; // b comes before a
    }
  }

  return undefined;
}
