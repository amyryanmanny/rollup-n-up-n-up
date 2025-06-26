import dotenv from "dotenv";

import { getInput } from "@actions/core";

export function getConfig(key: string): string | undefined {
  // Flags set by CI/CD - https://stackoverflow.com/a/73973555
  if (process.env.GITHUB_ACTIONS === "true") {
    const input = getInput(key);
    if (input !== "") {
      return input;
    }
  }

  // Fallback to local environment variable
  dotenv.config();
  return process.env[key];
}
