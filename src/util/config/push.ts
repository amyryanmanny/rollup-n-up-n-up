import strftime from "strftime";

import { getConfig } from "@util/config";
import { type PushTarget, type PushType } from "@push/github/client";
import { getDayOfThisWeek, type DayOfWeek } from "@util/date";
import { setOutput } from "@actions/core";

type PushConfig = {
  title?: string; // Title is optional - not all types require it
  body?: string; // Body is optional - if just fetching, it is not needed
  pushTargets?: PushTarget[];
  fetchTargets?: PushTarget[];
};

function getTitleDate(titleDateOption: string | undefined): Date {
  // TODO: Timezone handling
  const today = new Date();
  if (!titleDateOption) {
    return today;
  }

  titleDateOption = titleDateOption.toUpperCase();

  // Explicit TODAY
  if (titleDateOption === "TODAY") {
    return today;
  }

  // Check if it's a day of the week (e.g., MONDAY, TUESDAY, etc.)
  const dayOfWeek = getDayOfThisWeek(titleDateOption as DayOfWeek);
  if (dayOfWeek) {
    return dayOfWeek;
  }

  throw new Error(`Invalid TITLE_DATE option: ${titleDateOption}`);
}

export function getPushConfig(): PushConfig {
  let title = getConfig("TITLE");
  if (title) {
    // Format date fields in the title if necessary
    const titleDateOption = getConfig("TITLE_DATE");
    const titleDate = getTitleDate(titleDateOption);
    title = strftime(title, titleDate);
    setOutput("title", title);
  }

  const body = getConfig("BODY");
  if (!body) {
    throw new Error('The "body" input is required. See docs.');
  }

  const pushConfig = getConfig("TARGETS");
  const fetchTargetsConfig = getConfig("FETCH");

  if (!pushConfig && !fetchTargetsConfig) {
    throw new Error('Either the "targets" or "fetch" input is required.');
  }

  let pushTargets: PushTarget[] = [];
  if (pushConfig) {
    pushTargets = parsePushTargets(pushConfig);
    if (pushTargets.length === 0) {
      throw new Error(
        'No valid push targets found in the "targets" input. See docs.',
      );
    }
    if (!body) {
      throw new Error(
        'The "body" input is required when using the "targets" input.',
      );
    }
  }

  let fetchTargets: PushTarget[] = [];
  if (fetchTargetsConfig) {
    fetchTargets = parsePushTargets(fetchTargetsConfig);
    if (fetchTargets.length === 0) {
      throw new Error(
        'No valid fetch targets found in the "fetch" input. See docs.',
      );
    }
  }

  return { title, body, pushTargets, fetchTargets };
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
