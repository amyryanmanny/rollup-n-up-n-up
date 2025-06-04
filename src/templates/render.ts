import fs from "fs";
import path from "path";
import vento from "ventojs";

import * as filters from "./filters";
import * as plugins from "./plugins";

import { Client } from "../pull/github/client";

const rootDir = path.resolve(__dirname, "../..");
const templateDir = path.resolve(rootDir, "templates/");
const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: templateDir,
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

// Render
const template = await env.load(`${templateDir}/main.md.vto`);
const result = await template(globals);
console.debug(result.content);

// Write File
const outputPath = path.resolve(rootDir, "output.md");
fs.writeFileSync(outputPath, result.content, "utf8");
