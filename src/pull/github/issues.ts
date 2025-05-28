import { Client } from "./client";
import type { RestEndpointMethodTypes } from "@octokit/rest";

// Interface
type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];
type ListIssuesForProjectViewParameters = {
  organization: string;
  projectNumber: number;
  typeFilter: string | undefined;
  typeField: string | undefined; // Defaults to issueType
};

// Issue
type Issue =
  | RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number]
  | ProjectIssue;
type ProjectIssue = {
  // Until Projects are added to the REST API we have to construct the type
  // It's not worth making this a Partial, but maybe there should be a single supertype instead
  title: string;
  body: string;
  url: string;
  assignees: string[];
  type: string;
  comments: Array<ProjectIssueComment>;
};
const RE_UPDATE = RegExp(/<(!--\s*UPDATE\s*--)>/);

// Comment
type Comment = ProjectIssueComment;
type ProjectIssueComment = {
  author: string;
  body: string;
  createdAt: Date;
};

// Client Classes
class IssueWrapper {
  public issue: Issue;

  constructor(issue: Issue) {
    this.issue = issue;
  }

  title(): string {
    return this.issue.title;
  }

  latestUpdate(): Comment {
    const issue = this.issue;

    const comments = issue.comments;
    if (typeof comments == "number") {
      // For REST API issues, comments is a number
      // TODO: Fetch the comments for the issue
      throw new Error(
        "Fetching last update for REST API issues is not implemented yet.",
      );
    }

    const updates = comments
      .filter((comment) => {
        // Check if the comment body contains the update marker
        return RE_UPDATE.test(comment.body);
      })
      .sort((a, b) => {
        // Sort comments by createdAt in descending order
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    if (updates.length === 0) {
      return {
        author: "",
        body: "No updates found",
        createdAt: new Date(0), // Return a default date
      };
    }
    const newestUpdate = updates[0];
    // Remove the update marker from the body
    newestUpdate.body = newestUpdate.body.replace(RE_UPDATE, "");

    return newestUpdate;
  }
}

export class IssueList {
  private issues: Promise<Issue[]>;

  private constructor(issues: Promise<Issue[]>) {
    this.issues = issues;
  }

  static forRepo(
    client: Client,
    params: ListIssuesForRepoParameters,
  ): IssueList {
    const response = client.octokit.rest.issues.listForRepo(params);
    const data = response.then((res) => res.data);
    return new IssueList(data);
  }

  static forProjectV2(
    client: Client,
    params: ListIssuesForProjectViewParameters,
  ): IssueList {
    const query = `
      query($organization: String!, $projectNumber: Int!, $typeField: String!) {
        organization(login: $organization) {
          projectV2(number: $projectNumber) {
            title
            items(first: 100) {
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
                  fieldValueByName(name: $typeField) {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
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

    const response = client.octokit.graphql<{
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
                fieldValueByName: {
                  name?: string;
                } | null;
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
      typeField: params.typeField || "Type", // Default to "Type" if not provided
    });

    const data = response.then((res) => {
      const items = res.organization.projectV2.items;
      return items.edges
        .map((edge) => {
          const content = edge.node.content;
          if (!content) return null;
          return {
            title: content.title,
            body: content.body || "",
            url: content.url,
            assignees: content.assignees.nodes.map(
              (assignee) => assignee.login,
            ),
            type:
              content.issueType?.name || edge.node.fieldValueByName?.name || "",
            comments: content.comments.nodes.map((comment) => ({
              author: comment.author.login,
              body: comment.body,
              createdAt: new Date(comment.createdAt),
            })),
          } as ProjectIssue;
          // TODO: Paginate
        })
        .filter((item) => item !== null)
        .filter(
          // So we can filter by Bug, Initiative
          (item) => {
            return !params.typeFilter || item.type == params.typeFilter;
          },
        );
    });

    return new IssueList(data);
  }

  async all(): Promise<IssueWrapper[]> {
    const issues = await this.issues;
    return issues.map((issue) => new IssueWrapper(issue));
  }

  async length(): Promise<number> {
    const issues = await this.issues;
    return issues.length;
  }
}
