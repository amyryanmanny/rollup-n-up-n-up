export function emojiCompare(a: string, b: string): 1 | -1 | undefined {
  const emojiPriority = [
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
    "⚪️",
    "⬜️",
    "⚫️",
    "⬛️",
  ];

  for (let i = 0; i < emojiPriority.length; i++) {
    const emoji = emojiPriority[i];
    if (a.includes(emoji) && !b.includes(emoji)) {
      return -1; // a comes before b
    }
    if (!a.includes(emoji) && b.includes(emoji)) {
      return 1; // b comes before a
    }
  }

  return undefined;
}
