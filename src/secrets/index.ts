import { getInput } from "@actions/core";

export function getSecret(name: string): string | undefined {
  let secret;
  if (process.env.GITHUB_ACTIONS === "true") {
    secret = getInput(name);
  }

  // Fallback to local environment variable
  if (secret === undefined || secret === "") {
    secret = process.env[name];
  }

  return secret;
}
