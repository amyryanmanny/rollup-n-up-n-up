import type { RestEndpointMethodTypes } from "@octokit/rest";
import type { GitHubPushClient } from "./client";

type IssueGetResponse =
  RestEndpointMethodTypes["issues"]["get"]["response"]["data"];

type IssueCreateParams =
  RestEndpointMethodTypes["issues"]["create"]["parameters"];
export type IssueCreateResponse =
  RestEndpointMethodTypes["issues"]["create"]["response"]["data"];

type IssueUpdateParams =
  RestEndpointMethodTypes["issues"]["update"]["parameters"];
export type IssueUpdateResponse =
  RestEndpointMethodTypes["issues"]["update"]["response"]["data"];

export async function getIssueByTitle(
  client: GitHubPushClient,
  owner: string,
  repo: string,
  title: string,
): Promise<IssueGetResponse | undefined> {
  const response = await client.octokit.issues.listForRepo({
    owner,
    repo,
    state: "all", // Search through all states (open, closed)
  });

  const status = Number(response.status);
  if (status !== 200) {
    throw new Error(`Failed to list issues: ${response.status}`);
  }

  // No fancy searching, needs to be an exact match
  const issue = response.data.find((issue) => issue.title === title);

  return issue;
}

export async function createIssue(
  client: GitHubPushClient,
  params: IssueCreateParams,
): Promise<IssueCreateResponse> {
  const response = await client.octokit.issues.create(params);
  const status = Number(response.status);
  if (status !== 201) {
    throw new Error(`Failed to create issue: ${response.status}`);
  }
  return response.data;
}

export async function updateIssue(
  client: GitHubPushClient,
  params: IssueUpdateParams,
): Promise<IssueUpdateResponse> {
  const response = await client.octokit.issues.update(params);
  const status = Number(response.status);
  if (status !== 200) {
    throw new Error(`Failed to update issue: ${response.status}`);
  }
  return response.data;
}
