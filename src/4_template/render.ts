import vento from "ventojs";

import * as filters from "@transform/filters";
import * as plugins from "./plugins";

import { GitHubClient } from "@pull/github/client";

import { getConfig, checkDefaultTemplates, templatesDir } from "@config";
import { Memory } from "@transform/memory";

import * as debug from "./debug";
import { debugTotalGraphQLRateLimit } from "@pull/github/graphql/fragments/rate-limit";

// Include default templates for bundling
import "@templates/summary.md.vto";
import "@templates/interrogate.md.vto";

const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: templatesDir,
  autoescape: true,
});

// Register Filters
for (const filter of Object.values(filters)) {
  env.filters[filter.name] = filter;
}

// Register Plugins
for (const plugin of Object.values(plugins)) {
  env.use(plugin());
}

// Setup Globals
const github = new GitHubClient();
const memory = Memory.getInstance();
const today = new Date().toISOString().split("T")[0]; // TODO: Support the same date logic as push

const globals = { github, memory, today };

export async function renderTemplate(
  templatePath: string | undefined,
): Promise<string> {
  // Load the template
  const defaultTemplate = checkDefaultTemplates(templatePath);
  if (defaultTemplate) {
    console.log("Using default template:", defaultTemplate);
    templatePath = defaultTemplate;
  }
  const template = await env.load(templatePath!);

  // Render the template with the provided data
  const result = await template({
    ...globals,
    getConfig,
    // Debugging Functions
    ...debug,
    debugTemplate: () => debug.debugTemplate(template),
  });

  memory.headbonk(); // Reset memory after rendering
  debugTotalGraphQLRateLimit(); // Check how much RateLimit this report used

  return result.content;
}
