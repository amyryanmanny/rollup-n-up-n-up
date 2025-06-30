import { getConfig } from "@util/config";

import {
  DEFAULT_MARKER,
  type UpdateDetectionStrategy,
  type UpdateDetectionKind,
} from "@pull/github/update";

type UpdateDetection = {
  strategies: UpdateDetectionStrategy[];
};

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
    ];
  }

  // The marker strategy should always be first for now
  strategies.unshift({
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
