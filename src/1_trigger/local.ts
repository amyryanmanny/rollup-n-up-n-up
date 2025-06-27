import fs from "fs";
import path from "path";
import { argv } from "process";

import { renderTemplate } from "@template/render";

// Render Template
if (argv.length !== 3) {
  throw new Error("Usage: bun render <templateName>");
}
const templateName = argv[2];
const body = await renderTemplate(templateName);

// Write File
const outputPath = path.resolve(process.cwd(), "output.md");
fs.writeFileSync(outputPath, body, "utf8");
