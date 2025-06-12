import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

import { getGitHubSecrets } from "./util/secrets/github";

// Singleton
let octokitInstance: Octokit | null = null;

type Token = {
  value: string;
  kind: "app" | "pat" | "default";
};

function initOctokit(): Octokit {
  let instance: Octokit;
  const secrets = getGitHubSecrets();

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
        // TODO: Fetch installationId dynamically from actions context
        // https://github.com/octokit/app.js/issues/413#issuecomment-1560335463
        installationId,
      },
    });
  } else {
    throw new Error("Unknown authentication method");
  }

  return instance;
}

export async function getToken(): Promise<Token> {
  const octokit = getOctokit();
  const secrets = getGitHubSecrets();

  if (secrets.kind === "pat" || secrets.kind === "default") {
    const { token } = secrets;
    return {
      value: token,
      kind: secrets.kind,
    };
  } else if (secrets.kind === "app") {
    const { installationId } = secrets;
    const { data } = await octokit.apps.createInstallationAccessToken({
      installation_id: installationId,
    });
    return { value: data.token, kind: "app" };
  }
  throw new Error("Unknown authentication method");
}

export function getOctokit(): Octokit {
  if (!octokitInstance) {
    octokitInstance = initOctokit();
  }
  return octokitInstance;
}
