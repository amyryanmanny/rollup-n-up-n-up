import fs from "fs";
import path from "path";

import { getActionPath, isGitHubAction } from "@config";

export const TEMPLATE_DIR = path.join(process.cwd(), "templates");

const defaultTemplate = "summary";

function getDefaultTemplateDir(): string {
  if (isGitHubAction()) {
    return getActionPath(path.join("templates", "default"));
  }
  return path.join(TEMPLATE_DIR, "default");
}

export function checkDefaultTemplates(
  template: string | undefined,
): string | undefined {
  if (!template || template === "default") {
    template = defaultTemplate;
  }

  if (!template.includes(".")) {
    // If no file extension is provided, assume it's a .md.vto file
    template += ".md.vto";
  }

  // Search for templates bundled with the action
  const defaultDir = getDefaultTemplateDir();

  const templatePath = path.join(defaultDir, template);
  if (fs.existsSync(templatePath) && fs.lstatSync(templatePath).isFile()) {
    return templatePath;
  }
}
