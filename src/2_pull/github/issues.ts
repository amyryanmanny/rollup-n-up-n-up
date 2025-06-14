import { GitHubClient } from "./client";
import { getMemory } from "../../3_transform/memory";
import type { RestEndpointMethodTypes } from "@octokit/rest";

// Interface
type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];
type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
  typeFilter: string | undefined;
};

type SourceOfTruth = {
  url: string;
  title: string;
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

  // Properties
  author(): string {
    return this.comment.author;
  }

  createdAt(): Date {
    return this.comment.createdAt;
  }

  // Render / Memory Functions
  remember(bankIndex: number = 0) {
    this.memory.remember(
      `## Comment on ${this.issueTitle}:\n\n${this.comment.body}`,
      bankIndex,
    );
  }

  renderBody(memoryBankIndex: number = 0): string {
    this.remember(memoryBankIndex);
    return this.comment.body;
  }
}

class IssueWrapper {
  private issue: Issue;
  private memory = getMemory();

  constructor(issue: Issue) {
    this.issue = issue;
  }

  // Properties
  header(): string {
    return `[${this.issue.title}](${this.issue.url})`;
  }

  title(): string {
    return this.issue.title;
  }

  url(): string {
    return this.issue.url;
  }

  // Render / Memory Functions
  remember() {
    this.memory.remember(`## ${this.header()}:\n\n${this.issue.body}`);
  }

  renderBody(): string {
    this.remember();
    return this.issue.body || "";
  }

  // Comment Functions
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
  private sourceOfTruth: SourceOfTruth;
  private issues: IssueWrapper[];

  private constructor(sourceOfTruth: SourceOfTruth, issues: Issue[]) {
    this.sourceOfTruth = sourceOfTruth;
    this.issues = issues.map((issue) => new IssueWrapper(issue));
  }

  [Symbol.iterator]() {
    return this.issues[Symbol.iterator]();
  }

  header(): string {
    return `[${this.sourceOfTruth.title}](${this.sourceOfTruth.url})`;
  }

  title(): string {
    return this.sourceOfTruth.title;
  }

  url(): string {
    return this.sourceOfTruth.url;
  }

  static async forRepo(
    client: GitHubClient,
    params: ListIssuesForRepoParameters,
  ): Promise<IssueList> {
    const response = await client.octokit.rest.issues.listForRepo(params);
    const data = response.data;

    const url = `https://github.com/${params.owner}/${params.repo}`;
    const title = `Issues from ${params.owner}/${params.repo}`;

    return new IssueList({ url, title }, data);
  }

  static async forProject(
    client: GitHubClient,
    params: ListIssuesForProjectParameters,
  ): Promise<IssueList> {
    const query = `
      query($organization: String!, $projectNumber: Int!) {
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

    const response = await client.octokit.graphql<{
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
        if (!content) return null;
        return {
          title: content.title,
          body: content.body || "",
          url: content.url,
          assignees: content.assignees.nodes.map((assignee) => assignee.login),
          type: content.issueType?.name || "Issue",
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

    const url = `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`;
    const issueType = `${params.typeFilter}s`; // TODO: Pluralize
    const title = `${issueType} from ${response.organization.projectV2.title}`;

    return new IssueList({ url, title }, issues);
  }
}
