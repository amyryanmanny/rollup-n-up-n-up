import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

import { getGitHubSecrets } from "./secrets/github";

// Singleton
let octokitInstance: Octokit | null = null;

function initOctokit(): Octokit {
  const secrets = getGitHubSecrets();
  let instance: Octokit;

  if (secrets.kind === "pat" || secrets.kind === "default") {
    const { token } = secrets;

    instance = new Octokit({
      auth: token,
    });
  } else if (secrets.kind === "app") {
    const { appId, privateKey, installationId } = secrets;

    instance = new Octokit({
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

  return instance;
}

export function getOctokit(): Octokit {
  if (!octokitInstance) {
    octokitInstance = initOctokit();
  }
  return octokitInstance;
}
