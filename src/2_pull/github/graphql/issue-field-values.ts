import { getOctokit } from "@util/octokit";

import type { IssueFieldValue } from "../issue-fields";
import type { GetIssueParameters } from "./issue";

import {
  issueFieldValueNodeFragment,
  mapIssueFieldValueNodes,
  type IssueFieldValueNode,
} from "./fragments/issue-field-values";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";
import { pageInfoFragment } from "./fragments/page-info";

export type IssueFieldValuesResponse = {
  fields: Map<string, IssueFieldValue>;
};

export async function getIssueFieldValues(
  params: GetIssueParameters,
): Promise<IssueFieldValuesResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $repository: String!, $issueNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        repository(name: $repository) {
          issue(number: $issueNumber) {
            issueFieldValues(first: 100, after: $cursor) {
              nodes {
                ${issueFieldValueNodeFragment}
              }
              ${pageInfoFragment}
            }
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const startTime = new Date();
  const response = await octokit.graphql.paginate<
    {
      organization: {
        repository: {
          issue: {
            issueFieldValues: {
              nodes: IssueFieldValueNode[];
            };
          };
        };
      };
    } & RateLimit
  >(query, {
    ...params,
    headers: {
      // TODO: Find a way to set this globally (that actually works)
      "GraphQL-Features": "issue_fields",
    },
  });

  debugGraphQL("Get Issue Field Values", params, response, startTime);

  return {
    fields: mapIssueFieldValueNodes(
      response.organization.repository.issue.issueFieldValues.nodes,
    ),
  };
}
