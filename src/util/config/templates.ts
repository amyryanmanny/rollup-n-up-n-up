import fs from "fs";
import path from "path";

import { getActionPath, isGitHubAction } from "@config";

export const templatesDir = path.join(process.cwd(), "templates");
const defaultTemplate = "summary";

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
  let defaultDir = path.join(templatesDir, "default");
  if (isGitHubAction()) {
    defaultDir = getActionPath(defaultDir);
  }

  const templatePath = path.join(defaultDir, template);
  if (fs.existsSync(templatePath) && fs.lstatSync(templatePath).isFile()) {
    return templatePath;
  }
}
