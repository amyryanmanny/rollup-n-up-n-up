import path from "path";
import vento from "ventojs";

import { Client } from "../pull/github/client";

const tDir = path.resolve(__dirname, "../..", "templates/");
const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: tDir,
  autoescape: true,
});

// Create the client so the template can use it
const client = new Client();

const template = await env.load(`${tDir}/main.vto`);
const result = await template({ client });
console.log(result);
