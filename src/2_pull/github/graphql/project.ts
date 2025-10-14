import memoize from "memoize";

import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";
import type { Project } from "../project-fields";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import {
  mapProjectFieldValues,
  projectFieldValueFragment,
  type ProjectFieldValueNode,
} from "./fragments/project-fields";
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

async function listIssuesForProject(
  params: ListIssuesForProjectParameters,
): Promise<ListIssuesForProjectResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          title
          items(first: 5, after: $cursor) {
            nodes {
              content {
                __typename
                ... on Issue {
                  ${issueNodeFragment}
                }
              }
              fieldValues(first: 100) {
                nodes {
                  ${projectFieldValueFragment}
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
            nodes: Array<{
              content: IssueNode | null;
              fieldValues: {
                nodes: Array<ProjectFieldValueNode>;
              };
            }>;
            pageInfo: PageInfoForward;
          };
        };
      };
    } & RateLimit
  >(query, params);

  debugGraphQLRateLimit("List Issues for Project", params, response);

  const issues = response.organization.projectV2.items.nodes
    .filter((projectItem) => {
      const content = projectItem.content;
      return content && content.__typename === "Issue";
    })
    .map((projectItem) => {
      return {
        ...mapIssueNode(projectItem.content!),
        project: {
          organization: params.organization,
          number: params.projectNumber,
          fields: mapProjectFieldValues(projectItem.fieldValues.nodes),
        } as Project,
        isSubissue: false,
      };
    });

  return {
    issues,
    title: response.organization.projectV2.title,
    url: `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`,
  };
}

const memoizedListIssuesForProject = memoize(listIssuesForProject, {
  cacheKey: ([params]: [ListIssuesForProjectParameters]) =>
    JSON.stringify(params),
});

export { memoizedListIssuesForProject as listIssuesForProject };
