import { summary } from "@actions/core";
import { SUMMARY_ENV_VAR } from "@actions/core/lib/summary";

export function addLinkToSummary(message: string, url: string) {
  if (SUMMARY_ENV_VAR in process.env) {
    // If running on a GitHub Action, log the prompt for debugging
    summary.addLink(message, url).write();
  } else {
    console.debug(`${message}: ${url}`);
  }
}
