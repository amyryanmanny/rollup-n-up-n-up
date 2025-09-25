import { getConfig } from "@config";

export function getSlackToken() {
  const token = getConfig("SLACK_TOKEN");

  if (!token) {
    throw new Error("No Slack secrets configured. Please set SLACK_TOKEN");
  }

  return token;
}
