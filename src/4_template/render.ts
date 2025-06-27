import vento from "ventojs";

import * as filters from "./filters";
import * as plugins from "./plugins";

import { GitHubClient } from "../2_pull/github/client";
import { getMemory } from "../3_transform/memory";

const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: process.cwd(),
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
const memory = getMemory();
const today = new Date().toISOString().split("T")[0];

const globals = { github, memory, today };

function debugTemplate(source: string): string {
  return `<details><summary>Template</summary>\n\n\`\`\`\n${source}\n\`\`\`\n\n</details>`;
}

export async function renderTemplate(templatePath: string): Promise<string> {
  // Load the template
  const template = await env.load(templatePath);
  // Render the template with the provided data
  const result = await template({
    ...globals,
    debugTemplate: () => debugTemplate(template.source),
  });

  memory.headbonk(); // Reset memory after rendering

  console.info(result.content);
  return result.content;
}
