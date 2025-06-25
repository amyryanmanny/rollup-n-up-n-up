import fs from "fs";
import path from "path";
import { argv } from "process";

import { renderTemplate } from "@template/render";

const rootDir = process.cwd();
const templateDir = path.resolve(rootDir, "templates/");

// Render Template
if (argv.length !== 3) {
  throw new Error("Usage: bun render <templateName>");
}
const templateName = argv[2];
const body = await renderTemplate(`${templateDir}/${templateName}`);

// Write File
const outputPath = path.resolve(rootDir, "output.md");
fs.writeFileSync(outputPath, body, "utf8");
