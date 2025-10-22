import { error, notice, summary, warning } from "@actions/core";
import { isGitHubAction } from "./config";

// Logging Wrappers
export function emitInfo(message: string) {
  if (isGitHubAction()) {
    notice(message);
  } else {
    console.info(message);
  }
}

export function emitWarning(message: string) {
  if (isGitHubAction()) {
    warning(message);
  } else {
    console.warn(message);
  }
}

export function emitError(message: string) {
  if (isGitHubAction()) {
    error(message);
  } else {
    console.error(message);
  }
}

// Summary
export function addLinkToSummary(message: string, url: string) {
  if (isGitHubAction()) {
    // If running on a GitHub Action, log the prompt for debugging
    summary.addLink(message, url).write();
  } else {
    console.debug(`${message}: ${url}`);
  }
}
