import vento from "ventojs";

import * as filters from "./filters";
import * as plugins from "./plugins";

import { Client } from "../pull/github/client";

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
const client = new Client();
const today = new Date().toISOString().split("T")[0];

const globals = { client, today };

export async function renderTemplate(templatePath: string): Promise<string> {
  // Load the template
  const template = await env.load(templatePath);

  // Render the template with the provided data
  const result = await template(globals);

  client.reset(); // Reset the client after rendering

  console.debug(result.content);
  return result.content;
}
