// TODO: This file needs test cases bad
import { getConfig } from "@util/config";

import {
  type Timeframe,
  type UpdateDetectionStrategy,
} from "@pull/github/update";

type UpdateDetectionConfig = {
  strategies: UpdateDetectionStrategy[];
};

type FunctionSyntax = {
  name: string;
  args: string[];
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
      {
        kind: "marker",
        marker: DEFAULT_MARKER,
      },
      {
        kind: "timebox",
        timeframe: "last-week",
      },
      { kind: "skip" },
    ];
  }

  updateDetectionConfig = { strategies };
  return updateDetectionConfig;
}

function parseFunctionSyntax(input: string): FunctionSyntax {
  const functionCallRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/;

  const match = input.match(functionCallRegex);
  if (match) {
    const [, functionName, argsString] = match;
    const args = argsString
      .split(",")
      .map((arg) => arg.trim())
      .map((arg) => arg.replace(/^["']|["']$/g, "")); // Remove optional quotes
    return { name: functionName, args };
  } else {
    return { name: input, args: [] };
  }
}

function parseUpdateDetection(
  updateDetectionBlob: string,
): UpdateDetectionStrategy[] {
  // Process the configuration string as lines
  return updateDetectionBlob
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line): UpdateDetectionStrategy => {
      const { name: funcName, args } = parseFunctionSyntax(line);

      // Handle special functions
      switch (funcName) {
        case "skip":
          return { kind: "skip" };
        case "fail":
          return { kind: "fail" };
        case "blame":
          return { kind: "blame" };
      }

      // Extract the timeframe from funcName
      // E.g. lastWeek(), lastWeek(Update), lastWeek(MARKER)
      let timeframe: Timeframe | undefined = undefined;
      switch (funcName) {
        case "today":
          timeframe = "today";
          break;
        case "lastWeek":
          timeframe = "last-week";
          break;
        case "lastMonth":
          timeframe = "last-month";
          break;
        case "lastYear":
          timeframe = "last-year";
          break;
        case "allTime":
          timeframe = "all-time";
          break;
        default:
          if (args.length > 0) {
            throw new Error(
              `Invalid function call "${funcName}()" in update_detection config.`,
            );
          }
      }

      if (args.length === 0 && timeframe !== undefined) {
        // No section name provided, just handle timeframe
        return {
          kind: "timebox",
          timeframe,
        };
      }

      const sectionName = args[0] || funcName;

      switch (sectionName) {
        case "MARKER":
        case "DEFAULT_MARKER":
          return {
            kind: "marker",
            // TODO: Add a way to configure the Regex
            marker: DEFAULT_MARKER,
            timeframe,
          };
        default:
          return {
            kind: "section",
            section: sectionName,
            timeframe,
          };
      }
    });
}
