import { renderTemplate } from "../4_template/render";
import { setOutput, summary } from "@actions/core";
import { getConfig } from "../util/secrets";

const template = getConfig("template") || "main.md.vto";

// Render Template
const md = await renderTemplate(template);

setOutput("md", md);
summary.addRaw(md, true).write();
