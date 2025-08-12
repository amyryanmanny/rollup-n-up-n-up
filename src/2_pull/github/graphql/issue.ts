import { getOctokit } from "@util/octokit";

import type { Issue } from "../issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";

export type GetIssueParameters = {
  organization: string;
  repo: string;
  issueNumber: number;
};

export async function getIssue(params: GetIssueParameters): Promise<Issue> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repo: String!, $issueNumber: Int!) {
      organization(login: $organization) {
        repository(name: $repo) {
          issue(number: $issueNumber) {
            ${issueNodeFragment}
          }
        }
      }
    }
  `;

  const response = await octokit.graphql<{
    organization: {
      repository: {
        issue: IssueNode;
      };
    };
  }>(query, params);

  return mapIssueNode(response.organization.repository.issue);
}
