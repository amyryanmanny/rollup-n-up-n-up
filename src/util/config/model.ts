import { context } from "@actions/github";
import { getConfig } from "@util/config";

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
