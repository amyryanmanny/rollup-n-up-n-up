// TODO: This file needs test cases bad
import { getConfig } from "@util/config";

import {
  type UpdateDetectionStrategy,
  type UpdateDetectionKind,
} from "@pull/github/update";

type UpdateDetection = {
  strategies: UpdateDetectionStrategy[];
};

const DEFAULT_MARKER = /<!--\s*UPDATE\s*-->/i; // Case insensitive with variable spacing

export function getUpdateDetectionConfig(): UpdateDetection {
  let strategies: UpdateDetectionStrategy[];

  const updateDetectionConfig = getConfig("UPDATE_DETECTION");
  if (updateDetectionConfig) {
    strategies = parseUpdateDetection(updateDetectionConfig);
    if (strategies.length === 0) {
      throw new Error(
        'No valid strategies found in the "update_detection" input. See docs.',
      );
    }
  } else {
    strategies = [
      {
        kind: "section",
        name: "Update",
      },
      // { kind: "skip" },
    ];
  }

  // The marker strategy should come after the sections for now
  // TODO: Add a way to configure order, and possible Regex of this marker
  let markerIndex = strategies.findLastIndex((s) => s.kind === "section");
  if (markerIndex === -1) markerIndex = 0;
  strategies.splice(markerIndex, 0, {
    kind: "marker",
    marker: DEFAULT_MARKER,
  });

  return { strategies };
}

function parseUpdateDetection(
  updateDetectionBlob: string,
): UpdateDetectionStrategy[] {
  // Process the configuration string as lines
  return updateDetectionBlob
    .split("\n")
    .map((configLine) => {
      if (!configLine.trim()) {
        return undefined;
      }
      // TODO: Handle other types
      return {
        kind: "section" as UpdateDetectionKind,
        name: configLine.trim(),
      } as UpdateDetectionStrategy;
    })
    .filter((config) => config !== undefined);
}
