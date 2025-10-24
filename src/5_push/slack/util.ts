type SentMessage = {
  target: string;
  message: string;
};

const sentMessages: SentMessage[] = [];

export function isDuplicate(target: string, message: string): boolean {
  // Prevent sending duplicate messages in the same run
  const result = sentMessages.some(
    (entry) => entry.target === target && entry.message === message,
  );
  sentMessages.push({ target, message }); // Remember for next time
  return result;
}

export function slackLink(link: string, text: string): string {
  return `<${link}|${text}>`;
}
