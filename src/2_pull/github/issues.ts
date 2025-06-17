import type { RestEndpointMethodTypes } from "@octokit/rest";

import { GitHubClient } from "./client";
import { getMemory } from "@transform/memory";
import { splitMarkdownByHeaders, stripHtml, toSnakeCase } from "@util/string";

import {
  listIssuesForProject,
  type ListIssuesForProjectParameters,
  type ProjectIssue,
  type ProjectIssueComment,
} from "./project";
import {
  getProjectView,
  ProjectView,
  type GetProjectViewParameters,
} from "./project-view";

// Interface
type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];

type SourceOfTruth = {
  title: string;
  url: string;
};

// Issue
type Issue = RestIssue | ProjectIssue;
type RestIssue =
  RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];

// Comment
type Comment = ProjectIssueComment;

// Client Classes
class CommentWrapper {
  private memory = getMemory();

  static UPDATE_MARKER = RegExp(/<(!--\s*UPDATE\s*--)>/g); // TODO: Custom marker as input

  private comment: Comment;
  private issueTitle: string;

  private sections: Map<string, string>;

  constructor(issueTitle: string, comment: Comment) {
    this.issueTitle = issueTitle;
    this.comment = comment;

    this.sections = splitMarkdownByHeaders(comment.body);
  }

  static empty(): CommentWrapper {
    return new CommentWrapper("", {
      author: "",
      body: "No updates found",
      createdAt: new Date(0),
      url: "",
    });
  }

  // Properties
  get header(): string {
    return `[${this.issueTitle}](${this.comment.url})`;
  }

  get author(): string {
    return this.comment.author;
  }

  get dirtyBody(): string {
    // Return the raw body of the comment
    return this.comment.body;
  }

  get body(): string {
    // Return processed body of the comment
    return stripHtml(this.comment.body).trim();
  }

  get createdAt(): Date {
    return this.comment.createdAt;
  }

  // Helpers
  removeUpdateMarker() {
    this.comment.body = this.comment.body.replaceAll(
      CommentWrapper.UPDATE_MARKER,
      "",
    );
  }

  getSection(name: string): string | undefined {
    // Get the section by name
    const section = this.sections.get(toSnakeCase(name));
    if (section === undefined) {
      return undefined;
    }
    return stripHtml(section).trim();
  }

  get update(): string {
    // Get the update section
    const section = this.getSection("update");
    if (section) {
      return section.trim();
    }
    // If no update section, return the body
    return this.body;
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
    return this.body;
  }

  renderUpdate(memoryBankIndex: number = 0): string {
    this.remember(memoryBankIndex);
    return this.update;
  }
}

class IssueWrapper {
  private memory = getMemory();

  private issue: Issue;

  constructor(issue: Issue) {
    this.issue = issue;
  }

  // Properties
  get header(): string {
    return `[${this.title}](${this.url})`;
  }

  get title(): string {
    return this.issue.title.trim();
  }

  get url(): string {
    return this.issue.url;
  }

  get body(): string {
    return this.issue.body || "";
  }

  get type(): string {
    return this.issue.type?.name || "Issue";
  }

  get repo(): string | undefined {
    return this.issue.repository?.name;
  }

  get repoNameWithOwner(): string | undefined {
    return this.issue.repository?.full_name;
  }

  get projectFields(): Map<string, string> {
    // Return the custom fields of the issue
    if ("projectFields" in this.issue) {
      return this.issue.projectFields;
    }
    // For REST API issues, projectFields are not available
    return new Map<string, string>();
  }

  // Render / Memory Functions
  remember() {
    this.memory.remember(`## ${this.header}:\n\n${this.body}`);
  }

  renderBody(): string {
    this.remember();
    return this.body;
  }

  // Comment Functions
  get comments(): CommentWrapper[] {
    // TODO: Memoize
    const issue = this.issue;

    const comments = issue.comments;
    if (typeof comments == "number") {
      // For REST API issues, comments is a number
      // TODO: Fetch the comments for the issue
      throw new Error(
        "Fetching last update for REST API issues is not implemented yet.",
      );
    }

    const sortCommentsByDateDesc = (a: Comment, b: Comment) => {
      // Sort comments by createdAt in descending order
      return b.createdAt.getTime() - a.createdAt.getTime();
    };

    return comments
      .sort(sortCommentsByDateDesc)
      .map((comment) => new CommentWrapper(issue.title, comment));
  }

  latestComment(): CommentWrapper {
    const comments = this.comments;

    if (comments.length === 0) {
      return CommentWrapper.empty();
    }

    const latestComment = comments[0];
    return latestComment;
  }

  latestUpdate(): CommentWrapper {
    const comments = this.comments;

    const filterUpdates = (comment: CommentWrapper) => {
      // Check if the comment body contains the update marker
      if (CommentWrapper.UPDATE_MARKER.test(comment.dirtyBody)) {
        // SIDE_EFFECT: Remove the update marker from the body
        comment.removeUpdateMarker();
        return true;
      }

      if (comment.getSection("update") !== undefined) {
        // If the comment has an "update" header, it's considered an update
        return true;
      }

      return false;
    };
    const updates = comments.filter(filterUpdates);

    if (updates.length === 0) {
      return this.latestComment();
    }

    const latestUpdate = updates[0];
    return latestUpdate;
  }
}

export class IssueList {
  private sourceOfTruth: SourceOfTruth;
  private issues: IssueWrapper[];

  get length(): number {
    return this.issues.length;
  }

  [Symbol.iterator]() {
    return this.issues[Symbol.iterator]();
  }

  applyFilter(view: ProjectView) {
    // Filter the issues
    this.issues = this.issues.filter((wrapper) => {
      if (!view.checkType(wrapper.type)) {
        return false;
      }

      if (!view.checkRepo(wrapper.repoNameWithOwner)) {
        return false;
      }

      for (const field of view.getCustomFields()) {
        const value = wrapper.projectFields.get(field);
        if (!view.checkField(field, value)) {
          return false;
        }
      }

      return true;
    });

    // Scope the Source of Truth to the view
    const viewNumber = view.getNumber();
    if (viewNumber) {
      this.sourceOfTruth.url += `/views/${viewNumber}`;
    }
    this.sourceOfTruth.title += ` (${view.getName()})`;
  }

  get header(): string {
    return `[${this.sourceOfTruth.title}](${this.sourceOfTruth.url})`;
  }

  get title(): string {
    return this.sourceOfTruth.title;
  }

  get url(): string {
    return this.sourceOfTruth.url;
  }

  // Constructors
  private constructor(issues: Issue[], sourceOfTruth: SourceOfTruth) {
    this.sourceOfTruth = sourceOfTruth;
    this.issues = issues.map((issue) => new IssueWrapper(issue));
  }

  static async forRepo(
    client: GitHubClient,
    params: ListIssuesForRepoParameters,
  ): Promise<IssueList> {
    const response = await client.octokit.rest.issues.listForRepo(params);
    const issues = response.data;

    const url = `https://github.com/${params.owner}/${params.repo}`;
    const title = `Issues from ${params.owner}/${params.repo}`;

    return new IssueList(issues, { title, url });
  }

  static async forProject(
    client: GitHubClient,
    params: ListIssuesForProjectParameters,
  ): Promise<IssueList> {
    const response = await listIssuesForProject(client, params);

    const { issues, title, url } = response;

    return new IssueList(issues, { title, url });
  }

  static async forProjectView(
    client: GitHubClient,
    params: GetProjectViewParameters,
  ): Promise<IssueList> {
    let view: ProjectView;

    if (params.projectViewNumber === undefined) {
      if (params.customQuery === undefined) {
        throw new Error(
          "Either projectViewNumber or customQuery must be provided.",
        );
      }
      view = new ProjectView({
        name: "Custom Query",
        filter: params.customQuery,
      });
    } else {
      view = await getProjectView(client, params);
    }

    const issueList = await this.forProject(client, {
      organization: params.organization,
      projectNumber: params.projectNumber,
      typeFilter: view.getFilterType(),
    });
    issueList.applyFilter(view);

    return issueList;
  }
}
