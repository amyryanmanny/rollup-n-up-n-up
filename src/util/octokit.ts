import { context } from "@actions/github";

import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";

import { getGitHubSecrets, type GitHubSecretKind } from "./config/github";

const OctokitWithPlugins = Octokit.plugin(paginateGraphQL);
type OctokitType = InstanceType<typeof OctokitWithPlugins>;

type Token = {
  value: string;
  kind: GitHubSecretKind;
};

// Singleton
let octokitInstance: OctokitType;

function initOctokit(): OctokitType {
  let instance: OctokitType;
  const secrets = getGitHubSecrets();

  if (secrets.kind === "pat" || secrets.kind === "default") {
    const { token } = secrets;

    instance = new OctokitWithPlugins({
      auth: token,
    });
  } else if (secrets.kind === "app") {
    const { appId, installationId, privateKey } = secrets;

    instance = new OctokitWithPlugins({
      authStrategy: createAppAuth,
      auth: {
        appId,
        installationId,
        privateKey,
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
    let installationId = secrets.installationId;
    if (installationId === undefined) {
      // If no installationId provided, try to fetch it for the current org
      const { data: installation } = await octokit.apps.getOrgInstallation({
        org: context.repo.owner,
      });
      installationId = installation.id;
    }
    const { data: token } = await octokit.apps.createInstallationAccessToken({
      installation_id: installationId,
    });
    return { value: token.token, kind: "app" };
  }
  throw new Error("Unknown authentication method");
}

export function getOctokit(): OctokitType {
  if (!octokitInstance) {
    octokitInstance = initOctokit();
  }
  return octokitInstance;
}
