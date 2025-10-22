const sentMessages = Array<{ target: string; message: string }>();
export function isDuplicate(target: string, message: string): boolean {
  // Prevent sending duplicate messages in the same run
  const result = sentMessages.some(
    (entry) => entry.target === target && entry.message === message,
  );
  sentMessages.push({ target, message });
  return result;
}

export function slackLink(link: string, text: string): string {
  return `<${link}|${text}>`;
}
