import { getOctokit } from "@util/octokit";
import type { Issue } from "../issue";
import {
  ISSUE_PAGE_SIZE,
  NUM_ISSUE_ASSIGNESS,
  NUM_ISSUE_COMMENTS,
  NUM_ISSUE_LABELS,
} from ".";

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

export type IssueField = FieldSingleSelect | FieldMultiSelect | FieldDate;

export type FieldSingleSelect = {
  kind: "SingleSelect";
  value: string | null;
  options?: string[]; // Value options for the field
};

type FieldMultiSelect = {
  kind: "MultiSelect";
  values: string[] | null;
};

type FieldDate = {
  kind: "Date";
  value: string | null; // ISO 8601 date string
  date: Date | null;
};

export const slugifyProjectFieldName = (field: string): string => {
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
              content: {
                __typename: string;
                title: string;
                body: string;
                url: string;
                number: number;
                createdAt: string; // ISO 8601 date string
                updatedAt: string; // ISO 8601 date string
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
                assignees: {
                  nodes: Array<{
                    login: string;
                  }>;
                };
                labels: {
                  nodes: Array<{
                    name: string;
                  }>;
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
                      options?: Array<{ name: string }>; // For SingleSelect field options
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
    .map((edge): Issue | null => {
      const content = edge.node.content;
      if (!content || content.__typename !== "Issue") {
        return null;
      }
      return {
        title: content.title,
        body: content.body || "",
        url: content.url,
        number: content.number,
        createdAt: new Date(content.createdAt),
        updatedAt: new Date(content.updatedAt),
        type: content.issueType?.name || "Issue",
        repository: {
          name: content.repository.name,
          owner: content.repository.owner.login,
          nameWithOwner: content.repository.nameWithOwner,
        },
        assignees: content.assignees.nodes.map((assignee) => assignee.login),
        labels: content.labels.nodes.map((label) => label.name),
        comments: content.comments.nodes.map((comment) => ({
          author: comment.author?.login || "Unknown",
          body: comment.body,
          createdAt: new Date(comment.createdAt),
          url: comment.url,
        })),
        project: {
          number: params.projectNumber,
          fields: edge.node.fieldValues.edges.reduce((acc, fieldEdge) => {
            const fieldNode = fieldEdge.node;
            if (fieldNode && fieldNode.field) {
              let field: IssueField;
              switch (fieldNode.__typename) {
                case "ProjectV2ItemFieldSingleSelectValue":
                  field = {
                    kind: "SingleSelect",
                    value: fieldNode.name,
                    options: fieldNode.field.options!.map(
                      (option) => option.name,
                    ),
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
          }, new Map<string, IssueField>()),
        },
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
