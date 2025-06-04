import { renderTemplate } from "../templates/render";
import { getInput, setOutput } from "@actions/core";

const template = getInput("template") || "main.md.vto";

// Render Template
const md = await renderTemplate(template);

setOutput("md", md);
