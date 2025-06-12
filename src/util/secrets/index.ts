import * as dotenv from "dotenv";

import { getInput } from "@actions/core";

export function getConfig(key: string): string | undefined {
  let config: string | undefined;

  // Flags set by CI/CD - https://stackoverflow.com/a/73973555
  if (process.env.GITHUB_ACTIONS === "true") {
    config = getInput(key);
  }

  // Fallback to local environment variable
  if (config === "") {
    dotenv.config();
    config = process.env[key];
  }

  return config;
}
