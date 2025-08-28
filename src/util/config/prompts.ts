import fs from "fs";
import path from "path";
import yaml from "yaml";

import { getActionPath, getConfig, isGitHubAction } from "@config";
import type { PromptParameters } from "@transform/ai/summarize";

export function loadPromptFile(promptFilePath: string): PromptParameters {
  const configPath = getConfig(promptFilePath);
  if (configPath) {
    // If the prompt name matches an env variable, use its value instead
    // This allows for dynamic prompts in a GitHub Actions matrix, for example
    promptFilePath = configPath;
  }

  if (!path.basename(promptFilePath).includes(".")) {
    // If no file extension is provided, assume it's a .prompt.yaml file
    promptFilePath += ".prompt.yaml";
  }

  const directories = [
    "", // Absolute path
    path.join(".github", "prompts"),
    path.join(".github", "Prompts"),
    "prompts",
    "Prompts",
  ];

  // Search for prompts bundled with the action
  let defaultPromptDir = path.join(".github", "prompts", "default");
  if (isGitHubAction()) {
    defaultPromptDir = getActionPath(defaultPromptDir);
  }
  directories.unshift(defaultPromptDir);

  let yamlBlob: string | undefined;
  for (const directory of directories) {
    const fullPath = path.join(directory, promptFilePath);
    if (fs.existsSync(fullPath)) {
      yamlBlob = fs.readFileSync(fullPath, "utf-8");
    }
  }

  promptFilePath = path.resolve(promptFilePath); // Easier to debug
  if (yamlBlob === undefined) {
    throw new Error(`Prompt file "${promptFilePath}" does not exist.`);
  } else if (yamlBlob.trim() === "") {
    throw new Error(`Prompt file "${promptFilePath}" is empty.`);
  }

  // Parse YAML
  // TODO: Validate file structure
  return yaml.parse(yamlBlob) as PromptParameters;
}
