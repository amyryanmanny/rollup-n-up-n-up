import { WebClient } from "@slack/web-api";

import { getSlackToken } from "./config";

// Singleton
let slackInstance: WebClient;

function initSlack(): WebClient {
  const token = getSlackToken();

  return new WebClient(token);
}

export function getSlack(): WebClient {
  if (!slackInstance) {
    slackInstance = initSlack();
  }
  return slackInstance;
}
