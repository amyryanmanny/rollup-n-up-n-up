import path from "path";
import vento from "ventojs";

import * as filters from "./filters";
import * as plugins from "./plugins";

import { GitHubClient } from "@pull/github/client";

import { getConfig } from "@util/config";
import { Memory } from "@transform/memory";
import { SummaryCache } from "@transform/ai/cache";
import { debugMemory, debugSources, debugTemplate } from "./debug";

// TODO: Configurable templatesDir
const templatesDir = path.join(process.cwd(), "templates");

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

// Load Cache
const summaryCache = SummaryCache.getInstance();
summaryCache.load();

// Setup Globals
const github = new GitHubClient();
const memory = Memory.getInstance();
const today = new Date().toISOString().split("T")[0];

const globals = { github, memory, today };

export async function renderTemplate(templatePath: string): Promise<string> {
  // Load the template
  const template = await env.load(templatePath);
  // Render the template with the provided data
  const result = await template({
    ...globals,
    getConfig: (config: string) => getConfig(config),
    debugTemplate: () => debugTemplate(template),
    debugSources: () => debugSources(),
    debugMemory: (memoryBank: number = 0) => debugMemory(memoryBank),
  });

  memory.headbonk(); // Reset memory after rendering
  summaryCache.save(); // Save the summary cache

  return result.content;
}
