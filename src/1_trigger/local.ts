import fs from "fs";
import path from "path";

import { renderTemplate } from "@template/render";

const rootDir = process.cwd();
const templateDir = path.resolve(rootDir, "templates/");

// Render Template
const body = await renderTemplate(`${templateDir}/main.md.vto`);

// Write File
const outputPath = path.resolve(rootDir, "output.md");
fs.writeFileSync(outputPath, body, "utf8");
