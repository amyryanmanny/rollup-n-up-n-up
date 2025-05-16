import path from "path";
import vento from "ventojs";

import * as filters from "./filters";
import { Client } from "../pull/github/client";

const tDir = path.resolve(__dirname, "../..", "templates/");
const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: tDir,
  autoescape: true,
});

// Register all custom filters from filters.ts
for (const filter of Object.values(filters)) {
  env.filters[filter.name] = filter;
}
// Create the client so the template can use it
const client = new Client();

const template = await env.load(`${tDir}/main.vto`);
const result = await template({ client });
console.log(result);
