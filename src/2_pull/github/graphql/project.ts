import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import { pageInfoFragment } from "./fragments/page-info";
import {
  debugGraphQLRateLimit,
  rateLimitFragment,
  type RateLimit,
} from "./fragments/rate-limit";

export type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
};

type ListIssuesForProjectResponse = {
  issues: Array<Issue>;
  title: string;
  url: string;
};

export async function listIssuesForProject(
  params: ListIssuesForProjectParameters,
): Promise<ListIssuesForProjectResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          title
          items(first: 50, after: $cursor) {
            edges {
              node {
                id
                content {
                  __typename
                  ... on Issue {
                    ${issueNodeFragment}
                  }
                }
              }
            }
            ${pageInfoFragment}
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql.paginate<
    {
      organization: {
        projectV2: {
          title: string;
          items: {
            edges: Array<{
              node: {
                id: string;
                content: IssueNode | null;
              };
            }>;
            pageInfo: PageInfoForward;
          };
        };
      };
    } & RateLimit
  >(query, params);

  debugGraphQLRateLimit("List Issues for Project", params, response);

  const issues = response.organization.projectV2.items.edges
    .filter((projectItem) => {
      const content = projectItem.node.content;
      return content && content.__typename === "Issue";
    })
    .map((projectItem) => {
      return {
        ...mapIssueNode(projectItem.node.content!),
        isSubissue: false,
      };
    });

  return {
    issues,
    title: response.organization.projectV2.title,
    url: `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`,
  };
}
