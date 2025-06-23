import type { RestEndpointMethodTypes } from "@octokit/rest";

import type { GitHubPushClient } from "./client";

type IssueCommentCreateParams =
  RestEndpointMethodTypes["issues"]["createComment"]["parameters"];
type IssueCommentCreateResponse =
  RestEndpointMethodTypes["issues"]["createComment"]["response"]["data"];

export async function createIssueComment(
  client: GitHubPushClient,
  params: IssueCommentCreateParams,
): Promise<IssueCommentCreateResponse> {
  // This function creates a comment on a specific issue in a GitHub repository.
  const response = await client.octokit.issues.createComment(params);

  const status = Number(response.status);
  if (status !== 201) {
    // If the response is not created, throw an error
    throw new Error(`Failed to create issue comment: ${response.status}`);
  }

  // Return the created comment data
  return response.data;
}
