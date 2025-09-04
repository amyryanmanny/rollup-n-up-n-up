import fs from "fs";
import path from "path";

import vento from "ventojs";

import * as filters from "@transform/filters";
import * as plugins from "./plugins";

import { getActionPath, isGitHubAction } from "@config";

const TEMPLATE_DIR = "templates";
const DEFAULT_TEMPLATE = "summary";

const env = vento({
  dataVarname: "global",
  autoDataVarname: true,
  includes: path.join(process.cwd(), TEMPLATE_DIR),
  autoescape: true,
});

// Register Filters
for (const filter of Object.values(filters)) {
  env.filters[filter.name] = filter;
}

// Register Plugins
for (const plugin of Object.values(plugins)) {
  env.use(plugin());
}

export async function loadTemplate(templatePath: string | undefined) {
  const defaultTemplate = checkDefaultTemplates(templatePath);
  if (defaultTemplate) {
    console.log("Using default template:", defaultTemplate);
    templatePath = defaultTemplate;
  }

  if (!templatePath) {
    throw new Error("Template path is required");
  }

  if (!path.basename(templatePath).includes(".")) {
    // If no file extension, assume it's a .md.vto file
    templatePath += ".md.vto";
  }

  let from: string | undefined;
  if (path.isAbsolute(templatePath)) {
    // TODO: With a custom Loader for absolute paths
    // It should allow composing default templates
    from = "/";
    templatePath = `./${templatePath}`;
  }

  return await env.load(templatePath, from);
}

export function checkDefaultTemplates(
  template: string | undefined,
): string | undefined {
  if (!template || template === "default") {
    template = DEFAULT_TEMPLATE;
  }

  // Search for templates bundled with the action
  let defaultDir = path.join(TEMPLATE_DIR, "default");
  if (isGitHubAction()) {
    defaultDir = getActionPath(defaultDir);
  }

  const templatePath = path.join(defaultDir, template);
  if (fs.existsSync(templatePath) && fs.lstatSync(templatePath).isFile()) {
    return templatePath;
  }
}
