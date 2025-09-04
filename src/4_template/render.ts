import { GitHubClient } from "@pull/github/client";

import { getConfig } from "@config";
import { Memory } from "@transform/memory";

import { loadTemplate } from "./load";
import * as debug from "./debug";

import { debugTotalGraphQLRateLimit } from "@pull/github/graphql/fragments/rate-limit";

// Setup Globals
const github = new GitHubClient();
const memory = Memory.getInstance();
const today = new Date().toISOString().split("T")[0]; // TODO: Support the same date logic as push

const globals = { github, memory, today };

export async function renderTemplate(
  templatePath: string | undefined,
): Promise<string> {
  const template = await loadTemplate(templatePath);

  const result = await template({
    ...globals,
    getConfig,
    ...debug, // Debugging Functions
    debugTemplate: () => debug.debugTemplate(template),
  });

  memory.headbonk(); // Reset memory after rendering
  debugTotalGraphQLRateLimit(); // Check how much RateLimit this report used

  return result.content;
}
