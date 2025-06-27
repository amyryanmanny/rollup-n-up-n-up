import strftime from "strftime";

import { getConfig } from "@util/config";
import { type PushTarget, type PushType } from "@push/github/client";

type PushConfig = {
  targets: PushTarget[];
  title?: string; // Title is optional - not all types require it
  body: string;
};

export function getPushConfig(): PushConfig {
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

  const pushConfig = getConfig("TARGETS");
  if (!pushConfig) {
    throw new Error('The "targets" input is required. See docs.');
  }
  const targets = parsePushTargets(pushConfig);
  if (targets.length === 0) {
    throw new Error(
      'No valid push targets found in the "targets" input. See docs.',
    );
  }

  return { title, body, targets };
}

function parsePushTargets(targetBlob: string): PushTarget[] {
  // Process the configuration string as lines
  return targetBlob
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
