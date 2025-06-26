import { getConfig } from "@util/config";
import {
  GitHubPushClient,
  type PushTarget,
  type PushType,
} from "./github/client";
import strftime from "strftime";

type PushInputs = {
  targets: PushTarget[];
  title?: string; // Title is optional - not all types require it
  body: string;
};

export function getPushInputs(): PushInputs {
  let title = getConfig("TITLE");
  if (title) {
    // Format date fields in the title if necessary
    // TODO: Timezone handling
    title = strftime(title, new Date());
  }

  const body = getConfig("BODY");
  if (!body) {
    throw new Error('The "body" input is required. See docs.');
  }

  const pushConfig = getConfig("PUSH");
  if (!pushConfig) {
    throw new Error('The "push" input is required. See docs.');
  }
  const targets = parsePushConfigs(pushConfig);
  if (targets.length === 0) {
    throw new Error('No valid push targets found in the "push" input.');
  }

  return { title, body, targets };
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

const { targets, title, body } = getPushInputs();
client.pushAll(targets, title, body);
