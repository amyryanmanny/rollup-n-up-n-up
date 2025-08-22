import fs from "fs";
import path from "path";
import { argv } from "process";

import { renderTemplate } from "@template/render";

// Render Template
const templateName = argv[2];
const body = await renderTemplate(templateName || undefined);

// Write File
const outputPath = path.resolve(process.cwd(), "output.md");
fs.writeFileSync(outputPath, body, "utf8");
