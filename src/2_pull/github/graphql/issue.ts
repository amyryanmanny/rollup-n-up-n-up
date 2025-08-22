import { getOctokit } from "@util/octokit";

import type { Issue } from "../issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import {
  debugGraphQLRateLimit,
  rateLimitFragment,
  type RateLimit,
} from "./fragments/rate-limit";

export type GetIssueParameters = {
  organization: string;
  repository: string;
  issueNumber: number;
};

export async function getIssue(params: GetIssueParameters): Promise<Issue> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repository: String!, $issueNumber: Int!) {
      organization(login: $organization) {
        repository(name: $repository) {
          issue(number: $issueNumber) {
            ${issueNodeFragment}
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql<
    {
      organization: {
        repository: {
          issue: IssueNode;
        };
      };
    } & RateLimit
  >(query, params);

  debugGraphQLRateLimit("Get Issue", params, response);

  return mapIssueNode(response.organization.repository.issue);
}
