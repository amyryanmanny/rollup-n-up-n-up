import { type RestEndpointMethodTypes } from "@octokit/rest";
import { isOctokitRequestError } from "@util/error";
import type { GitHubPushClient } from "./client";

type CheckFileResult =
  | {
      kind: "exists";
      sha: string;
    }
  | {
      kind: "not-found";
    }
  | {
      kind: "is-directory";
    };

type GetContentParams =
  RestEndpointMethodTypes["repos"]["getContent"]["parameters"];

type CreateOrUpdateFileContentsParams =
  RestEndpointMethodTypes["repos"]["createOrUpdateFileContents"]["parameters"];
type CreateOrUpdateFileContentsResponse =
  RestEndpointMethodTypes["repos"]["createOrUpdateFileContents"]["response"]["data"];

async function checkRepoFile(
  client: GitHubPushClient,
  params: GetContentParams,
): Promise<CheckFileResult> {
  try {
    const response = await client.octokit.repos.getContent(params);
    const data = response.data;

    if (Array.isArray(data)) {
      return { kind: "is-directory" };
    }

    if (data.type === "file") {
      return {
        kind: "exists",
        sha: data.sha, // Return the SHA for existing files
      };
    }
  } catch (error: unknown) {
    if (isOctokitRequestError(error) && error.status === 404) {
      return { kind: "not-found" }; // File does not exist
    }
    throw error; // Re-throw unexpected error
  }

  throw new Error(
    `Unexpected response type when checking repo-file: ${params.path}`,
  );
}

export async function createOrUpdateRepoFile(
  client: GitHubPushClient,
  params: CreateOrUpdateFileContentsParams,
): Promise<CreateOrUpdateFileContentsResponse> {
  const checkResult = await checkRepoFile(client, {
    owner: params.owner,
    repo: params.repo,
    path: params.path,
    ref: params.branch,
  });

  let sha: string | undefined;
  if (checkResult.kind === "is-directory") {
    throw new Error(
      `Cannot create a file at a directory path. Filename is missing: ${params.path}`,
    );
  } else if (checkResult.kind === "not-found") {
    sha = undefined; // No SHA needed for new files
  } else if (checkResult.kind === "exists") {
    sha = checkResult.sha; // Use the existing SHA for updates
  }

  // Create or update the file
  const response = await client.octokit.repos.createOrUpdateFileContents({
    ...params,
    sha,
  });

  return response.data;
}

// TODO: Open a PR
