import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  ISSUE_PAGE_SIZE,
  NUM_ISSUE_ASSIGNESS,
  NUM_ISSUE_COMMENTS,
  NUM_ISSUE_LABELS,
} from ".";

import { mapIssueNode, type IssueNode } from "./issue";
import {
  mapProjectFieldValues,
  type ProjectFieldValueEdge,
} from "./project-fields";

export type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
};

type ListIssuesForProjectResponse = {
  issues: Issue[];
  title: string;
  url: string;
};

export type ProjectItems = {
  projectItems: {
    nodes: Array<{
      project: {
        number: number;
      };
      fieldValues: {
        edges: Array<ProjectFieldValueEdge>;
      };
    }>;
  };
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
          items(first: ${ISSUE_PAGE_SIZE}, after: $cursor) {
            edges {
              node {
                id
                content {
                  __typename
                  ... on Issue {
                    title
                    body
                    url
                    number
                    state
                    createdAt
                    updatedAt
                    issueType {
                      name
                    }
                    repository {
                      name
                      owner {
                        login
                      }
                      nameWithOwner
                    }
                    assignees(first: ${NUM_ISSUE_ASSIGNESS}) {
                      nodes {
                        login
                      }
                    }
                    labels(first: ${NUM_ISSUE_LABELS}) {
                      nodes {
                        name
                      }
                    }
                    comments(last: ${NUM_ISSUE_COMMENTS}) {
                      nodes {
                        author {
                          login
                        }
                        body
                        createdAt
                        updatedAt
                        url
                      }
                    }
                    parent {
                      title
                      url
                      number
                    }
                  }
                }
                fieldValues(first: 100) {
                  edges {
                    node {
                      __typename
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                            options {
                              name
                            }
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field {
                          ... on ProjectV2Field {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
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
    .filter((projectItemEdge) => {
      const content = projectItemEdge.node.content;
      return content && content.__typename === "Issue";
    })
    .map((projectItemEdge) => {
      return {
        ...mapIssueNode(projectItemEdge.node.content!),
        project: {
          number: params.projectNumber,
          fields: mapProjectFieldValues(projectItemEdge.node.fieldValues.edges),
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
