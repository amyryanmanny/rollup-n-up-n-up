import fs from "fs";
import path from "path";

import { getAssetPath, isGitHubAction } from "@util/config";

// TODO: Configurable templatesDir
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

  let defaultDir: string;
  if (isGitHubAction()) {
    defaultDir = getAssetPath();
  } else {
    defaultDir = path.join(templatesDir, "default");
  }

  const templatePath = path.join(defaultDir, template);
  if (fs.existsSync(templatePath) && fs.lstatSync(templatePath).isFile()) {
    return templatePath;
  }
}
