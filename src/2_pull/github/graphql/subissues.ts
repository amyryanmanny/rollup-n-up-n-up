import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";
import type { GetIssueParameters } from "./issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import { type ProjectItems } from "./fragments/project";
import { pageInfoFragment } from "./fragments/page-info";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";

export type ListSubissuesForIssueParameters = GetIssueParameters;
type ListSubissuesForIssueResponse = {
  subissues: Issue[];
  title: string;
  url: string;
};

const pageSize = 50;

// TODO: Subissues short circuit to improve performance
// query {
//   node(id: "I_123") {
//     ... on Issue {
//       subIssuesSummary {
//         total
//         completed
//         percentCompleted
//       }
//     }
//   }
// }

export async function listSubissuesForIssue(
  params: ListSubissuesForIssueParameters,
): Promise<ListSubissuesForIssueResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $repository: String!, $issueNumber: Int!, $cursor: String) {
      repositoryOwner(login: $organization) {
        repository(name: $repository) {
          issue(number: $issueNumber) {
            title
            url
            subIssues(first: ${pageSize}, after: $cursor) {
              nodes {
                ${issueNodeFragment}
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
      repositoryOwner: {
        repository: {
          issue: {
            title: string;
            url: string;
            subIssues: {
              nodes: Array<IssueNode & ProjectItems>;
            };
            pageInfo: PageInfoForward;
          };
        };
      };
    } & RateLimit
  >(query, {
    ...params,
    headers: {
      "GraphQL-Features": "issue_fields",
    },
  });

  const issue = response.repositoryOwner.repository.issue;
  const subissues = issue.subIssues.nodes.map((subIssue) => {
    return {
      ...mapIssueNode(subIssue),
      isSubissue: true,
    };
  });

  debugGraphQL("List Subissues for Issue", params, response, startTime);

  return {
    subissues,
    title: `Subissues for ${issue.title} (#${params.issueNumber})`,
    url: issue.url,
  };
}
