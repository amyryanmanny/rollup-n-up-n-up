import { getConfig } from ".";

type GitHubAppSecrets = {
  kind: "app";
  appId: string;
  privateKey: string;
  installationId: number;
};

type GitHubPatSecrets = {
  kind: "pat";
  token: string;
};

type GitHubDefaultSecrets = {
  // GITHUB_TOKEN is set by all GitHub Actions
  kind: "default";
  token: string;
};

export type GitHubSecrets =
  | GitHubAppSecrets
  | GitHubPatSecrets
  | GitHubDefaultSecrets;

export function getGitHubSecrets(): GitHubSecrets {
  const secrets =
    getGitHubAppSecrets() ?? getGitHubPatSecrets() ?? getGitHubDefaultSecrets();
  if (secrets !== undefined) {
    return secrets;
  }

  throw new Error(
    "No GitHub secrets configured. Please set GITHUB_APP_*, or GITHUB_PAT_TOKEN.",
  );
}

function getGitHubAppSecrets(): GitHubAppSecrets | undefined {
  const appId = getConfig("GITHUB_APP_ID");
  const installationId = getConfig("GITHUB_APP_INSTALLATION_ID");
  const privateKey = getConfig("GITHUB_APP_PRIVATE_KEY");

  if (!appId || !installationId || !privateKey) {
    return undefined;
  }

  return {
    kind: "app",
    appId,
    installationId: parseInt(installationId),
    privateKey,
  };
}

function getGitHubPatSecrets(): GitHubPatSecrets | undefined {
  const token = getConfig("GITHUB_PAT_TOKEN");

  if (!token) {
    return undefined;
  }

  return {
    kind: "pat",
    token,
  };
}

function getGitHubDefaultSecrets(): GitHubDefaultSecrets | undefined {
  const token = getConfig("GITHUB_TOKEN");

  if (!token) {
    return undefined;
  }

  return {
    kind: "default",
    token,
  };
}
