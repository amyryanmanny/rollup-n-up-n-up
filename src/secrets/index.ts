import * as dotenv from "dotenv";

import { getInput } from "@actions/core";

export function getSecret(name: string): string | undefined {
  let secret: string | undefined;
  // Flags set by CI/CD - https://stackoverflow.com/a/73973555
  if (process.env.GITHUB_ACTIONS === "true") {
    secret = getInput(name);
  }

  // Fallback to local environment variable
  if (secret === undefined || secret === "") {
    dotenv.config();
    secret = process.env[name];
  }

  return secret;
}
