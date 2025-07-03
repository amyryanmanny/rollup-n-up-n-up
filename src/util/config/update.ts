// TODO: This file needs test cases bad
import { getConfig } from "@util/config";

import { type UpdateDetectionStrategy } from "@pull/github/update";

type UpdateDetectionConfig = {
  strategies: UpdateDetectionStrategy[];
};

const DEFAULT_MARKER = /<!--\s*UPDATE\s*-->/i; // Case insensitive with variable spacing

// Singleton
let updateDetectionConfig: UpdateDetectionConfig | undefined;

export function getUpdateDetectionConfig(): UpdateDetectionConfig {
  if (updateDetectionConfig) {
    return updateDetectionConfig;
  }

  let strategies: UpdateDetectionStrategy[];

  const config = getConfig("UPDATE_DETECTION");
  if (config) {
    strategies = parseUpdateDetection(config);
    if (strategies.length === 0) {
      throw new Error(
        'No valid strategies found in the "update_detection" input. See docs.',
      );
    }
  } else {
    strategies = [
      {
        kind: "section",
        section: "Update",
      },
      { kind: "skip" },
    ];
  }

  // The marker strategy should always go after the sections for now
  // TODO: Add a way to configure Regex of this marker
  let markerIndex = strategies.findLastIndex((s) => s.kind === "section");
  if (markerIndex === -1) markerIndex = 0;

  strategies.splice(markerIndex, 0, {
    kind: "marker",
    marker: DEFAULT_MARKER,
    timeframe: "last-week",
  });

  updateDetectionConfig = { strategies };
  return updateDetectionConfig;
}

function parseUpdateDetection(
  updateDetectionBlob: string,
): UpdateDetectionStrategy[] {
  // Process the configuration string as lines
  return updateDetectionBlob
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line): UpdateDetectionStrategy | undefined => {
      // TODO: Extract function-call syntax like "lastWeek(Update)"
      // Command, ...args

      if (line === "skip" || line === "skip()") {
        return { kind: "skip" };
      }

      if (line === "fail" || line === "fail()") {
        return { kind: "fail" };
      }

      if (line === "blame" || line === "blame()") {
        return { kind: "blame" };
      }

      // TODO: Handle marker type

      // Any lines that don't match above are considered sections
      return {
        kind: "section",
        section: line,
      };
    });
}
