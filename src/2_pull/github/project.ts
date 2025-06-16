import { GitHubClient } from "./client";

export type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
  typeFilter: string[] | undefined;
};
export type ListIssuesForProjectResponse = {
  issues: ProjectIssue[];
  title: string;
  url: string;
};

export type ProjectIssue = {
  // Until Projects are added to the REST API we have to construct the type
  // It's not worth making this a Partial, but maybe there should be a single supertype instead
  title: string;
  body: string;
  url: string;
  assignees: string[];
  type: {
    name?: string;
  };
  repository: {
    name: string;
    full_name: string;
  };
  comments: Array<ProjectIssueComment>;
  projectFields: Map<string, string>;
};

export type ProjectIssueComment = {
  author: string;
  body: string;
  createdAt: Date;
};

const slugifyProjectFieldName = (field: string): string => {
  // RoB Area FY25Q4 -> rob-area-fy25q4
  // Slugs are not accessible with GraphQL :(
  return field.toLowerCase().replace(/\s+/g, "-");
};

export async function listIssuesForProject(
  client: GitHubClient,
  params: ListIssuesForProjectParameters,
): Promise<ListIssuesForProjectResponse> {
  const query = `
    query paginate($organization: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          title
          items(first: 100, after: $cursor) {
            edges {
              node {
                id
                content {
                  __typename
                  ... on Issue {
                    title
                    assignees(first: 5) {
                      nodes {
                        login
                      }
                    }
                    issueType {
                      name
                    }
                    body
                    url
                    repository {
                      name
                      nameWithOwner
                    }
                    comments(last: 20) {
                      nodes {
                        author {
                          login
                        }
                        body
                        createdAt
                      }
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

  const response = await client.octokit.graphql.paginate<{
    organization: {
      projectV2: {
        title: string;
        items: {
          edges: Array<{
            node: {
              id: string;
              content: {
                __typename: string;
                title: string;
                body: string;
                url: string;
                assignees: {
                  nodes: Array<{ login: string }>;
                };
                issueType: {
                  name: string;
                } | null;
                repository: {
                  name: string;
                  nameWithOwner: string;
                };
                comments: {
                  nodes: Array<{
                    author: {
                      login: string;
                    };
                    body: string;
                    createdAt: string; // ISO 8601 date string
                  }>;
                };
              } | null;
              fieldValues: {
                edges: Array<{
                  node: {
                    __typename: string;
                    name: string;
                    field: {
                      name: string; // SingleSelectField name
                    };
                  } | null;
                }>;
              };
            };
          }>;
          pageInfo: {
            endCursor: string;
            hasNextPage: boolean;
          };
        };
      };
    };
  }>(query, {
    organization: params.organization,
    projectNumber: params.projectNumber,
  });

  const items = response.organization.projectV2.items;
  const issues = items.edges
    .map((edge) => {
      const content = edge.node.content;
      if (!content || content.__typename !== "Issue") {
        return null;
      }
      return {
        title: content.title,
        body: content.body || "",
        url: content.url,
        assignees: content.assignees.nodes.map((assignee) => assignee.login),
        type: {
          name: content.issueType?.name,
        },
        repository: {
          name: content.repository.name,
          full_name: content.repository.nameWithOwner,
        },
        comments: content.comments.nodes.map((comment) => ({
          author: comment.author.login,
          body: comment.body,
          createdAt: new Date(comment.createdAt),
        })),
        projectFields: edge.node.fieldValues.edges.reduce((acc, fieldEdge) => {
          const fieldNode = fieldEdge.node;
          if (
            fieldNode &&
            fieldNode.__typename === "ProjectV2ItemFieldSingleSelectValue"
          ) {
            const fieldName = slugifyProjectFieldName(fieldNode.field.name);
            const fieldValue = fieldNode.name;
            acc.set(fieldName, fieldValue);
          }
          return acc;
        }, new Map<string, string>()),
      };
    })
    .filter((item) => item !== null)
    .filter(
      // So we can filter by Bug, Initiative
      (item) => {
        return (
          params.typeFilter === undefined ||
          params.typeFilter.length === 0 ||
          params.typeFilter.includes(item.type?.name || "")
        );
      },
    );

  return {
    issues,
    title: response.organization.projectV2.title,
    url: `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`,
  };
}
