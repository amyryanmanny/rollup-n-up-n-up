import { setOutput, summary } from "@actions/core";

import { getConfig } from "@config";
import { renderTemplate } from "@template/render";

const template = getConfig("TEMPLATE");

// Render Template
const md = await renderTemplate(template);

setOutput("md", md);
summary.addRaw(`\n${md}`, true).write();
