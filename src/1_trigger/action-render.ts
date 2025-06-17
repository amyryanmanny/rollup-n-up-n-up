import { setOutput, summary } from "@actions/core";

import { getConfig } from "@config";
import { renderTemplate } from "@template/render";

const template = getConfig("template") || "main.md.vto";

// Render Template
const md = await renderTemplate(template);

setOutput("md", md);
summary.addRaw(md, true).write();
