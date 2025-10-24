import dotenv from "dotenv";

import { getInput } from "@actions/core";

import { isGitHubAction } from "./github";

export function getConfig(
  key: string,
  required: boolean = false,
): string | undefined {
  // Flags set by CI/CD - https://stackoverflow.com/a/73973555
  if (isGitHubAction()) {
    // @nektos/act correctly sets this environment variable
    const input = getInput(key, { required });
    if (input !== "") {
      return input;
    }
  }

  // Fallback to local environment variable
  const envValue = getEnv(key);

  if (required && !envValue) {
    throw new Error(`Missing required env variable: ${key}`);
  }

  return envValue;
}

export function getEnv(key: string): string | undefined {
  dotenv.config();
  // Check various case variations of the key
  return (
    process.env[key] ??
    process.env[key.toUpperCase()] ??
    process.env[key.toLowerCase()]
  );
}

export * from "./assets";
export * from "./fetch";
export * from "./github";
export * from "./render";
export * from "./models";
export * from "./prompts";
export * from "./push";
export * from "./slack";
export * from "./truthy";
export * from "./update-detection";
