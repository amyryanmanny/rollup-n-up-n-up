import { GitHubClient } from "@pull/github/client";

import { formatDateAsYYYYMMDD } from "@util/date";

import { getConfig } from "@config";
import { Memory } from "@transform/memory";

import { loadTemplate } from "./load";
import * as debug from "./debug";

// Setup Globals
const github = new GitHubClient();
const memory = Memory.getInstance();
const today = formatDateAsYYYYMMDD(); // TODO: Support the same date formatting as push

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

  debug.logGraphQLTotals(); // Check how much RateLimit this report used

  // Reset some State after Rendering
  memory.headbonk();
  debug.resetGraphQLTotals();

  return result.content;
}
