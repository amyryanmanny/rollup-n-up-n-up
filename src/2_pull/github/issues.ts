import pluralize from "pluralize";

import { GitHubClient } from "./client";
import { getMemory } from "../../3_transform/memory";
import type { RestEndpointMethodTypes } from "@octokit/rest";

// Interface
type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];
type ListIssuesForProjectParameters = {
  organization: string;
  projectNumber: number;
  typeFilter: string[] | undefined;
};
type ProjectViewParameters = {
  organization: string;
  projectNumber: number;
  projectViewNumber: number;
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
const slugifyFieldName = (field: string): string => {
  // RoB Area FY25Q4 -> rob-area-fy25q4
  // Slugs are not accessible with GraphQL :(
  return field.toLowerCase().replace(/\s+/g, "-");
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

class ProjectViewFilter {
  private name: string;
  private filters: Map<string, string[]>;
  private excludeFilters: Map<string, string[]>;

  constructor({ name, filter }: { name: string; filter: string }) {
    this.name = name;

    this.filters = new Map<string, string[]>();
    this.excludeFilters = new Map<string, string[]>();

    // Parse the filter string. Only split on spaces outside of quotes.
    filter.match(/(?:[^\s"]+|"[^"]*")+/g)?.forEach((f) => {
      const [key, value] = f.split(":");
      if (key && value) {
        const values = value.split(",").map((v) => {
          if (v.startsWith('"') && v.endsWith('"')) {
            // Remove quotes from the value
            v = v.slice(1, -1).trim();
          }
          return v.trim();
        });
        if (key.startsWith("-")) {
          // Exclude filter
          this.excludeFilters.set(key.trim().slice(1), values);
        } else {
          // Regular filter
          this.filters.set(key.trim(), values);
        }
      }
    });
  }

  getName(): string {
    return this.name;
  }

  getFilterType(): string[] | undefined {
    return this.filters.get("type");
  }

  getFilterOpen(): string[] | undefined {
    // By default only open issues are fetched anyway
    return this.filters.get("is");
  }

  static slugifyFieldName(field: string): string {
    // RoB Area FY25Q4 -> rob-area-fy25q4
    // Slugs are not accessible with GraphQL :(
    return field.toLowerCase().replace(/\s+/g, "-");
  }

  static defaultFields(): string[] {
    return ["type", "is", "assignee", "label", "milestone"];
  }

  getCustomFields(): string[] {
    const defaultFields = ProjectViewFilter.defaultFields();
    return Array.from(this.filters.keys()).filter((key) => {
      return !defaultFields.includes(key);
    });
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
          projectFields: edge.node.fieldValues.edges.reduce(
            (acc, fieldEdge) => {
              const fieldNode = fieldEdge.node;
              if (
                fieldNode &&
                fieldNode.__typename === "ProjectV2ItemFieldSingleSelectValue"
              ) {
                const fieldName = slugifyFieldName(fieldNode.field.name);
                const fieldValue = fieldNode.name;
                acc.set(fieldName, fieldValue);
              }
              return acc;
            },
            new Map<string, string>(),
          ),
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

    // Construct a readable Source of Truth
    let issueType: string;
    if (params.typeFilter === undefined || params.typeFilter.length === 0) {
      issueType = "Issues";
    } else {
      issueType = params.typeFilter.map((type) => pluralize(type)).join(", ");
    }

    const url = `https://github.com/orgs/${params.organization}/projects/${params.projectNumber}`;
    const title = `${issueType} from ${response.organization.projectV2.title}`;

    return new IssueList({ url, title }, issues);
  }

  private static async getView(
    client: GitHubClient,
    params: ProjectViewParameters,
  ): Promise<ProjectViewFilter> {
    const query = `
      query($organization: String!, $projectNumber: Int!, $projectViewNumber: Int!) {
        organization(login: $organization) {
          projectV2(number: $projectNumber) {
            view(number: $projectViewNumber) {
              name
              filter
            }
          }
        }
      }
    `;

    const response = await client.octokit.graphql<{
      organization: {
        projectV2: {
          view: {
            name: string;
            filter: string;
          };
        };
      };
    }>(query, {
      organization: params.organization,
      projectNumber: params.projectNumber,
      projectViewNumber: params.projectViewNumber,
    });

    return new ProjectViewFilter({
      name: response.organization.projectV2.view.name,
      filter: response.organization.projectV2.view.filter,
    });
  }

  static async forProjectView(
    client: GitHubClient,
    params: ProjectViewParameters,
  ): Promise<IssueList> {
    const view = await this.getView(client, params);
    const issues = await this.forProject(client, {
      organization: params.organization,
      projectNumber: params.projectNumber,
      typeFilter: view.getFilterType(),
    });

    issues.sourceOfTruth.url += `/views/${params.projectViewNumber}`;
    issues.sourceOfTruth.title += ` - ${view.getName()}`;
    return issues;
  }
}
