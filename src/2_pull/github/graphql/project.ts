import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import {
  projectFieldValueEdgesFragment,
  mapProjectFieldValues,
  type ProjectFieldValueEdge,
} from "./fragments/project-fields";
import { pageInfoFragment } from "./fragments/page-info";

export type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
};

type ListIssuesForProjectResponse = {
  issues: Issue[];
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
                fieldValues(first: 100) {
                  ${projectFieldValueEdgesFragment}
                }
              }
            }
            ${pageInfoFragment}
          }
        }
      }
    }
  `;

  const response = await octokit.graphql.paginate<{
    organization: {
      projectV2: {
        title: string;
        items: {
          edges: Array<{
            node: {
              id: string;
              content: IssueNode | null;
              fieldValues: {
                edges: Array<ProjectFieldValueEdge>;
              };
            };
          }>;
          pageInfo: PageInfoForward;
        };
      };
    };
  }>(query, params);

  const issues = response.organization.projectV2.items.edges
    .filter((projectItem) => {
      const content = projectItem.node.content;
      return content && content.__typename === "Issue";
    })
    .map((projectItem) => {
      return {
        ...mapIssueNode(projectItem.node.content!),
        project: {
          number: params.projectNumber,
          fields: mapProjectFieldValues(projectItem.node.fieldValues.edges),
        },
        isSubissue: false,
      };
    });

  return {
    issues,
    title: response.organization.projectV2.title,
    url: `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`,
  };
}
