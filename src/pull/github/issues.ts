import { Client } from "./client";
import { getMemory } from "../../ai/memory";
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
type Issue = RestIssue | ProjectIssue;
type RestIssue =
  RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];
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

// Comment
type Comment = ProjectIssueComment;
type ProjectIssueComment = {
  author: string;
  body: string;
  createdAt: Date;
};

const sortCommentsByDateDesc = (a: Comment, b: Comment) => {
  // Sort comments by createdAt in descending order
  return b.createdAt.getTime() - a.createdAt.getTime();
};
const filterUpdates = (comment: Comment) => {
  const updateMarker = RegExp(/<(!--\s*UPDATE\s*--)>/g); // TODO: Custom marker as input
  // Check if the comment body contains the update marker
  const isUpdate = updateMarker.test(comment.body);
  if (!isUpdate) return false;

  // SIDE_EFFECT: Remove the update marker from the body
  comment.body = comment.body.replaceAll(updateMarker, "");

  return true;
};

// Client Classes
class CommentWrapper {
  private comment: Comment;
  private issueTitle: string;
  private memory = getMemory();

  constructor(issueTitle: string, comment: Comment) {
    this.issueTitle = issueTitle;
    this.comment = comment;
  }

  static empty(): CommentWrapper {
    return new CommentWrapper("", {
      author: "",
      body: "No updates found",
      createdAt: new Date(0),
    });
  }

  author(): string {
    return this.comment.author;
  }

  remember() {
    this.memory.remember(`Comment on ${this.issueTitle}: ${this.comment.body}`);
  }

  renderBody(): string {
    this.remember();
    return this.comment.body;
  }

  createdAt(): Date {
    return this.comment.createdAt;
  }
}

class IssueWrapper {
  private issue: Issue;
  private memory = getMemory();

  constructor(issue: Issue) {
    this.issue = issue;
  }

  title(): string {
    return this.issue.title;
  }

  remember() {
    this.memory.remember(`${this.issue.title}: ${this.issue.body}`);
  }

  renderBody(): string {
    this.remember();
    return this.issue.body || "";
  }

  getComments(): Comment[] {
    const issue = this.issue;

    const comments = issue.comments;
    if (typeof comments == "number") {
      // For REST API issues, comments is a number
      // TODO: Fetch the comments for the issue
      throw new Error(
        "Fetching last update for REST API issues is not implemented yet.",
      );
    }

    return comments;
  }

  latestComment(): CommentWrapper {
    const comments = this.getComments().sort(sortCommentsByDateDesc);

    if (comments.length === 0) {
      return CommentWrapper.empty();
    }

    const latestComment = comments[0];
    return new CommentWrapper(this.issue.title, latestComment);
  }

  latestUpdate(): CommentWrapper {
    const comments = this.getComments().sort(sortCommentsByDateDesc);
    const updates = comments.filter(filterUpdates);

    if (updates.length === 0) {
      return CommentWrapper.empty();
    }

    const latestUpdate = updates[0];
    return new CommentWrapper(this.issue.title, latestUpdate);
  }
}

export class IssueList {
  private issues: Promise<Issue[]>;

  private constructor(issues: Promise<Issue[]>) {
    this.issues = issues;
  }

  [Symbol.iterator]() {
    // Explicitly reject iteration. Debugging attempts to iterate over the Promise object is confusing.
    throw new Error(
      "IssueLists cannot be iterated directly. Did you mean to call '.all()'?",
    );
  }

  static forRepo(
    client: Client,
    params: ListIssuesForRepoParameters,
  ): IssueList {
    const response = client.octokit.rest.issues.listForRepo(params);
    const data = response.then((res) => res.data);
    return new IssueList(data);
  }

  static forProject(
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
              edge.node.fieldValueByName?.name || content.issueType?.name || "",
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

  async count(): Promise<number> {
    const issues = await this.issues;
    return issues.length;
  }
}
