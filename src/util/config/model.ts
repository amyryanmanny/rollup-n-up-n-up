import fs from "fs";
import path from "path";
import yaml from "yaml";

import { context } from "@actions/github";
import { getAssetPath, getConfig, isGitHubAction } from "@util/config";
import type { PromptParameters } from "@transform/ai/summarize";

export function getModelEndpoint(tokenKind: string): string {
  const customEndpoint = getConfig("MODEL_ENDPOINT") || "";
  if (customEndpoint !== "") {
    return customEndpoint;
  }

  switch (tokenKind) {
    case "app":
      // Apps must use the org-specific endpoint. Assume the current org
      return `https://models.github.ai/orgs/${context.repo.owner}/inference`;
    case "pat":
    case "default":
      // Default endpoint for PAT or default token
      return "https://models.github.ai/inference";
    default:
      throw new Error(`Unknown token kind: ${tokenKind}`);
  }
}

export function loadPromptFile(promptFilePath: string): PromptParameters {
  const configPath = getConfig(promptFilePath);
  if (configPath) {
    // If the prompt name matches an env variable, use its value instead
    // This allows for dynamic prompts in a GitHub Actions matrix, for example
    promptFilePath = configPath;
  }

  if (!promptFilePath.includes(".")) {
    // If no file extension is provided, assume it's a .prompt.yaml file
    promptFilePath += ".prompt.yaml";
  }

  const directories = [
    "", // Absolute path
    ".github/prompts",
    ".github/prompts/default",
    ".github/Prompts",
    "prompts",
    "Prompts",
  ];

  if (isGitHubAction()) {
    directories.unshift(getAssetPath());
  }

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
  return yaml.parse(yamlBlob) as PromptParameters;
}
