import path from "path";

import { getEnv } from "@config";

export function isGitHubAction() {
  // Don't use getConfig, to avoid recursion
  return getEnv("GITHUB_ACTIONS") === "true";
}

export function getActionPath(fileName?: string): string {
  // Constructs an absolute path relative to the running GitHub Action directory
  if (!isGitHubAction()) {
    // Only works when running the index.js bundle
    throw new Error("Not running in a GitHub Action, don't use this function");
  }
  // Back out of dist/ directory
  const actionPath = path.resolve(path.join(import.meta.dirname, "..", ".."));
  if (!fileName) {
    return actionPath;
  }
  return path.join(actionPath, fileName);
}
