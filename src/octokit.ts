import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";

import { type GitHubSecrets } from "./secrets/github";

// Singleton
let octokitInstance: Octokit | null = null;

export function initOctokit(secrets: GitHubSecrets): Octokit {
  if (!octokitInstance) {
    if (secrets.kind === "pat" || secrets.kind === "default") {
      const { token } = secrets;

      octokitInstance = new Octokit({
        auth: token,
      });
    } else if (secrets.kind === "app") {
      const { appId, privateKey, installationId } = secrets;

      octokitInstance = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId,
          privateKey,
          installationId,
        },
      });
    } else {
      throw new Error("Unknown authentication method");
    }
  }

  return octokitInstance;
}

export function getOctokit(): Octokit {
  if (!octokitInstance) {
    throw new Error(
      "Octokit has not been initialized. Call initOctokit first.",
    );
  }
  return octokitInstance;
}
