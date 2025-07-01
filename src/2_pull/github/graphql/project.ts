import { getOctokit } from "@util/octokit";
import type { Issue } from "../issue";

export type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
  typeFilter: string[] | undefined;
};

type ListIssuesForProjectResponse = {
  issues: Issue[];
  title: string;
  url: string;
};

export type ProjectField = ProjectFieldSingleSelect | ProjectFieldDate;

type ProjectFieldSingleSelect = {
  kind: "SingleSelect";
  value: string | null;
};

type ProjectFieldDate = {
  kind: "Date";
  value: string | null; // ISO 8601 date string
  date: Date | null;
};

const slugifyProjectFieldName = (field: string): string => {
  // RoB Area FY25Q4 -> rob-area-fy25q4
  // Slugs are not accessible with GraphQL :(
  return field.toLowerCase().replace(/\s+/g, "-");
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
          items(first: 100, after: $cursor) {
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
                    assignees(first: 5) {
                      nodes {
                        login
                      }
                    }
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
                    comments(last: 100) {
                      nodes {
                        author {
                          login
                        }
                        body
                        createdAt
                        url
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
              content: {
                __typename: string;
                title: string;
                body: string;
                url: string;
                number: number;
                assignees: {
                  nodes: Array<{ login: string }>;
                };
                issueType: {
                  name: string;
                } | null;
                repository: {
                  name: string;
                  owner: {
                    login: string;
                  };
                  nameWithOwner: string;
                };
                comments: {
                  nodes: Array<{
                    author: {
                      login: string;
                    } | null;
                    body: string;
                    createdAt: string; // ISO 8601 date string
                    url: string;
                  }>;
                };
              } | null;
              fieldValues: {
                edges: Array<{
                  node: {
                    __typename: string;
                    name: string | null; // SingleSelect value name
                    date: string | null; // Date value
                    field: {
                      name: string; // Field name
                    } | null; // Null if no union type match
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

  const issues = response.organization.projectV2.items.edges
    .map((edge) => {
      const content = edge.node.content;
      if (!content || content.__typename !== "Issue") {
        return null;
      }
      return {
        title: content.title,
        body: content.body || "",
        url: content.url,
        number: content.number,
        assignees: content.assignees.nodes.map((assignee) => assignee.login),
        type: content.issueType?.name || "Issue",
        repository: {
          name: content.repository.name,
          owner: content.repository.owner.login,
          nameWithOwner: content.repository.nameWithOwner,
        },
        comments: content.comments.nodes.map((comment) => ({
          author: comment.author?.login || "Unknown",
          body: comment.body,
          createdAt: new Date(comment.createdAt),
          url: comment.url,
        })),
        projectFields: edge.node.fieldValues.edges.reduce((acc, fieldEdge) => {
          const fieldNode = fieldEdge.node;
          if (fieldNode && fieldNode.field) {
            let field: ProjectField;
            switch (fieldNode.__typename) {
              case "ProjectV2ItemFieldSingleSelectValue":
                field = {
                  kind: "SingleSelect",
                  value: fieldNode.name,
                };
                break;
              case "ProjectV2ItemFieldDateValue": {
                const date = fieldNode.date;
                field = {
                  kind: "Date",
                  value: date,
                  date: date ? new Date(date) : null,
                };
                break;
              }
              default:
                // Ignore other field types for now
                return acc;
            }
            const fieldName = slugifyProjectFieldName(fieldNode.field.name);
            acc.set(fieldName, field);
          }
          return acc;
        }, new Map<string, ProjectField>()),
      };
    })
    .filter((item) => item !== null)
    .filter(
      // So we can filter by Bug, Initiative
      (item) => {
        return (
          // Unoptimized, but works for now
          params.typeFilter === undefined ||
          params.typeFilter.length === 0 ||
          params.typeFilter.includes(item.type)
        );
      },
    );

  return {
    issues,
    title: response.organization.projectV2.title,
    url: `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`,
  };
}
