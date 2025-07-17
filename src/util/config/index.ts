import dotenv from "dotenv";

import { getInput } from "@actions/core";

export function getConfig(
  key: string,
  required: boolean = false,
): string | undefined {
  // Flags set by CI/CD - https://stackoverflow.com/a/73973555
  if (process.env.GITHUB_ACTIONS === "true") {
    // @nektos/act correctly sets this environment variable
    const input = getInput(key, { required });
    if (input !== "") {
      return input;
    }
  }

  // Fallback to local environment variable
  dotenv.config();
  // Check various case variations of the key
  return (
    process.env[key] ??
    process.env[key.toUpperCase()] ??
    process.env[key.toLowerCase()]
  );
}

export const isTrueValue = (value: string | undefined): boolean => {
  // Check against "true" sentinels users might use in the YAML. Not the same as truthy
  return (
    value === "true" ||
    value === "1" ||
    value === "yes" ||
    value === "on" ||
    value === "enabled"
  );
};

export * from "./github";
export * from "./model";
export * from "./push";
export * from "./update";
