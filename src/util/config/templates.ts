import fs from "fs";
import path from "path";

import { getActionPath, isGitHubAction } from "@config";

export const TEMPLATE_DIR = path.join(process.cwd(), "templates");

const defaultDir = path.join("templates", "default");
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
  let dir;
  if (isGitHubAction()) {
    dir = getActionPath(defaultDir);
  } else {
    dir = path.join(process.cwd(), defaultDir);
  }

  const templatePath = path.join(dir, template);
  if (fs.existsSync(templatePath) && fs.lstatSync(templatePath).isFile()) {
    return templatePath;
  }
}
