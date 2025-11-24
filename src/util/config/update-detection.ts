// TODO: This file needs test cases bad
import { getConfig } from "@config";

import {
  type Timeframe,
  type UpdateDetectionStrategy,
} from "@pull/github/update-detection";

type FunctionSyntax = {
  name: string;
  args: string[];
};

const HTML_MARKER = /<!--\s*UPDATE\s*-->/i; // Case insensitive with variable spacing

export class UpdateDetection {
  // Singleton
  private constructor() {
    const config = getConfig("UPDATE_DETECTION");
    this.setStrategies(config);
  }

  private static instance: UpdateDetection;
  static getInstance(): UpdateDetection {
    if (!UpdateDetection.instance) {
      UpdateDetection.instance = new UpdateDetection();
    }
    return UpdateDetection.instance;
  }

  public strategies: UpdateDetectionStrategy[] = [];

  debug(): string {
    let output = "";
    for (const strategy of this.strategies) {
      if (strategy.kind === "timebox") {
        output += `- Strategy: ${strategy.kind}, Timeframe: ${strategy.timeframe}\n`;
      }
      if (strategy.kind === "section") {
        output += `- Strategy: ${strategy.kind}, Section: ${strategy.section}, Timeframe: ${strategy.timeframe}\n`;
      }
      if (strategy.kind === "marker" && strategy.marker instanceof RegExp) {
        // Regex can't be JSON stringified, which is why this function is the way it is
        output += `- Strategy: ${strategy.kind}, Marker: ${strategy.marker.toString()}, Timeframe: ${strategy.timeframe}\n`;
      }

      if (strategy.kind === "skip") {
        output += `- Strategy: ${strategy.kind}\n`;
      }
      if (strategy.kind === "fail") {
        output += `- Strategy: ${strategy.kind}\n`;
      }
      if (strategy.kind === "blame") {
        output += `- Strategy: ${strategy.kind}\n`;
      }
    }
    return output;
  }

  setStrategies(config?: string) {
    let strategies: UpdateDetectionStrategy[];

    if (config !== undefined) {
      strategies = UpdateDetection.parseStrategies(config);
    } else {
      strategies = UpdateDetection.defaultStrategies;
    }

    this.strategies = strategies;
  }

  static defaultStrategies: UpdateDetectionStrategy[] = [
    {
      kind: "marker",
      marker: HTML_MARKER,
      timeframe: "last-month",
    },
    {
      kind: "timebox",
      timeframe: "last-month",
    },
    { kind: "skip" },
  ];

  static parseFunctionSyntax(functionCallStr: string): FunctionSyntax {
    const functionCallRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/;

    const match = functionCallStr.match(functionCallRegex);
    if (match) {
      const [, functionName, argsString] = match;
      const args = argsString!
        .split(",")
        .map((arg) => arg.trim())
        .map((arg) => arg.replace(/^["']|["']$/g, "")); // Remove optional quotes
      return { name: functionName!, args };
    } else {
      return { name: functionCallStr, args: [] };
    }
  }

  static parseStrategies(
    configBlob: string | string[],
  ): UpdateDetectionStrategy[] {
    let lines: string[] = [];
    if (typeof configBlob === "string") {
      // Split by newlines or commas
      lines = configBlob.split(/[\n,]+/);
    } else if (
      Array.isArray(configBlob) &&
      configBlob.every((line) => typeof line === "string")
    ) {
      lines = configBlob;
    } else {
      throw new Error(
        "Invalid update_detection configuration; must be a string or array of strings.",
      );
    }

    return lines
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line): UpdateDetectionStrategy => {
        const { name: funcName, args } =
          UpdateDetection.parseFunctionSyntax(line);

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
          case "HTML_MARKER":
          case "DEFAULT_MARKER":
            return {
              kind: "marker",
              // TODO: Add a way to configure the Regex
              marker: HTML_MARKER,
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

  get timeframe(): Timeframe {
    // Return the widest Timeframe from the strategies
    // Useful for issue-level filtering
    const order: Timeframe[] = [
      "today",
      "last-week",
      "last-month",
      "last-year",
      "all-time",
    ];

    if (!this.strategies.some((s) => "timeframe" in s)) {
      // No timeframe specified anywhere
      return "all-time";
    }

    let max: Timeframe = "today";
    for (const strategy of this.strategies) {
      let timeframe: Timeframe | undefined = undefined;
      if ("timeframe" in strategy) {
        timeframe = strategy.timeframe;
      }

      if (timeframe !== undefined) {
        if (order.indexOf(timeframe) > order.indexOf(max)) {
          max = timeframe;
        }
      }
    }
    return max;
  }
}
