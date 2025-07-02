// TODO: This file needs test cases bad
import { getConfig } from "@util/config";

import {
  type UpdateDetectionStrategy,
  type UpdateDetectionKind,
} from "@pull/github/update";

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

  // The marker strategy should come after the sections for now
  // TODO: Add a way to configure order, and possible Regex of this marker
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
    .map((line) => {
      if (line === "") {
        return undefined;
      }

      // TODO: Extract function-call syntax like "lastWeek(Update)"

      if (line === "skip" || line === "skip()") {
        return {
          kind: "skip" as UpdateDetectionKind,
        } as UpdateDetectionStrategy;
      }

      // TODO: Handle other types

      // Any lines that don't match above are considered sections
      return {
        kind: "section" as UpdateDetectionKind,
        name: line,
      } as UpdateDetectionStrategy;
    })
    .filter((config) => config !== undefined);
}
