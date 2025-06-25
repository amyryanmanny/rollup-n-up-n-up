import { getConfig } from "@util/config";
import {
  GitHubPushClient,
  type PushTarget,
  type PushType,
} from "./github/client";

type PushInputs = {
  title?: string; // Optional title for the push
  body: string; // Required body for the push
  pushConfig: string; // Configuration string for the push
};

function getPushInputs(): PushInputs {
  const title = getConfig("TITLE");
  const body = getConfig("BODY");
  if (!body) {
    throw new Error('The "body" input is required. See docs.');
  }

  const pushConfig = getConfig("PUSH");
  if (!pushConfig) {
    throw new Error('The "push" input is required. See docs.');
  }
  return { title, body, pushConfig };
}

function parsePushConfigs(config: string): PushTarget[] {
  // Process the configuration string as lines
  return config
    .split("\n")
    .map((configLine) => {
      // Split each line into type and URL
      if (!configLine.trim() || !configLine.includes(":")) {
        return undefined;
      }
      const [type, ...url] = configLine.split(":").map((s) => s.trim());
      return { type: type as PushType, url: url.join(":") };
    })
    .filter((config) => config !== undefined);
}

// Main function to execute the push
const client = new GitHubPushClient();

const { title, body, pushConfig } = getPushInputs();
const targets = parsePushConfigs(pushConfig);
client.pushAll(targets, title, body);
