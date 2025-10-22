import { context } from "@actions/github";

// Octokit
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

// Plugins
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { retry } from "@octokit/plugin-retry";
import { throttling, type ThrottlingOptions } from "@octokit/plugin-throttling";

import { getGitHubSecrets, type GitHubSecretKind } from "./config/github";

const OctokitWithPlugins = Octokit.plugin(paginateGraphQL, retry, throttling);
type OctokitType = InstanceType<typeof OctokitWithPlugins>;

type Token = {
  value: string;
  kind: GitHubSecretKind;
};

// Singleton
let octokitInstance: OctokitType;

// ThrottlingOptions
// TODO: Clustering: https://github.com/octokit/plugin-throttling.js/?tab=readme-ov-file#clustering
const throttle: ThrottlingOptions = {
  onRateLimit: (retryAfter, options, octokit, retryCount) => {
    console.warn(
      `Request quota exhausted for request ${options.method} ${options.url}`,
    );
    if (retryCount < 3) {
      console.info(`Retrying after ${retryAfter} seconds!`);
      return true;
    }
  },
  onSecondaryRateLimit: (retryAfter, options) => {
    console.warn(
      `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
    );
  },
};

function initOctokit(): OctokitType {
  const secrets = getGitHubSecrets();

  if (secrets.kind === "pat" || secrets.kind === "default") {
    const { token } = secrets;

    return new OctokitWithPlugins({
      auth: token,
      throttle,
    });
  } else if (secrets.kind === "app") {
    const { appId, installationId, privateKey } = secrets;

    return new OctokitWithPlugins({
      authStrategy: createAppAuth,
      auth: {
        appId,
        installationId,
        privateKey,
      },
      throttle,
    });
  } else {
    throw new Error("Unknown authentication method");
  }
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
