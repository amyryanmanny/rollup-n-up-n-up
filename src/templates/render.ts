import fs from "fs";
import path from "path";
import vento from "ventojs";

import * as filters from "./filters";
import { Client } from "../pull/github/client";

const rootDir = path.resolve(__dirname, "../..");
const templateDir = path.resolve(rootDir, "templates/");
const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: templateDir,
  autoescape: true,
});

// Register all Filters
for (const filter of Object.values(filters)) {
  env.filters[filter.name] = filter;
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
