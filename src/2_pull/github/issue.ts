import type { RestEndpointMethodTypes } from "@octokit/rest";

import { GitHubClient } from "./client";
import { getMemory } from "@transform/memory";
import { emojiCompare } from "@util/emoji";

import {
  listIssuesForProject,
  type ListIssuesForProjectParameters,
  type ProjectField,
  type ProjectIssue,
} from "./project";
import {
  getProjectView,
  ProjectView,
  type GetProjectViewParameters,
} from "./project-view";
import { CommentWrapper, type Comment } from "./comment";
import { title } from "@util/string";

// Interface
type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];

type SourceOfTruth = {
  title: string;
  url: string;
  groupKey?: string; // When using a groupBy
};

type Issue = RestIssue | ProjectIssue;
type RestIssue =
  RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];

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

  private get _body(): string {
    return this.issue.body || "";
  }

  get body(): string {
    this.remember();
    return this._body;
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

  // Fields
  field(fieldName: string): string {
    // Return the value of the field by name
    switch (fieldName) {
      case "title":
        return this.title;
      case "url":
        return this.url;
      case "body":
        return this.body;
      case "type":
        return this.type;
      case "repo":
        return this.repo ?? "";
      case "full_name":
      case "repoNameWithOwner":
        return this.repoNameWithOwner ?? "";
    }

    // Fallback to projectFields
    const projectField = this._projectFields.get(fieldName)?.value;
    return projectField ?? "";
  }

  get _projectFields(): Map<string, ProjectField> {
    // Internal method - Return the projectFields of the issue
    if ("projectFields" in this.issue) {
      return this.issue.projectFields;
    }
    // For REST API issues, projectFields are undefined
    return new Map<string, ProjectField>();
  }

  get projectFields(): Map<string, string> {
    // Return the projectFields of the issue, mapped back to string representation
    return new Map(
      Array.from(this._projectFields.entries()).map(([name, field]) => {
        return [name, field.value ?? ""];
      }),
    );
  }

  // Comment Functions
  get comments(): CommentWrapper[] {
    // TODO: Memoize
    const issue = this.issue;

    const comments = issue.comments;
    if (typeof comments == "number") {
      // For REST API issues, comments is a number
      // TODO: Fetch the comments for the issue - figure out async. Use CommentList
      throw new Error(
        "Fetching last update for REST API issues is not implemented yet.",
      );
    }

    // TODO: Create a CommentList to perform this logic
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
    const filterUpdates = (comment: CommentWrapper) => {
      if (comment.hasUpdateMarker) {
        // Check if the comment body contains the update sentinel
        // SIDE_EFFECT: Remove the update marker from the body
        comment.removeUpdateMarker();
        return true;
      }
      if (comment.findUpdate() !== undefined) {
        // If it has one of the defined update sections, it's considered an update
        return true;
      }
      return false;
    };
    const updates = this.comments.filter(filterUpdates);

    if (updates.length === 0) {
      return this.latestComment();
    }

    const latestUpdate = updates[0];
    return latestUpdate;
  }

  // Render / Memory Functions
  private get rendered(): string {
    // Issues are Level 3
    return `### ${this.header}\n\n${this._body}\n\n`;
  }

  remember() {
    this.memory.remember(this.rendered);
  }

  render(): string {
    this.remember();
    return this.rendered;
  }
}

export class IssueList {
  private memory = getMemory();

  private sourceOfTruth: SourceOfTruth;
  private issues: IssueWrapper[];

  get length(): number {
    return this.issues.length;
  }

  [Symbol.iterator]() {
    return this.issues[Symbol.iterator]();
  }

  // Issue Filtering / Grouping / Sorting
  filter(view: ProjectView) {
    // Filter the issues
    this.issues = this.issues.filter((wrapper) => {
      // First check against default fields
      if (!view.checkType(wrapper.type)) {
        return false;
      }

      if (!view.checkRepo(wrapper.repoNameWithOwner)) {
        return false;
      }

      // Next check against all the custom Project Fields
      for (const field of view.customFields) {
        const value = wrapper._projectFields.get(field);
        if (!view.checkField(field, value)) {
          return false;
        }
      }

      return true;
    });

    // Scope the Source of Truth to the view
    if (view.number) {
      this.sourceOfTruth.url += `/views/${view.number}`;
    } else {
      this.sourceOfTruth.url += `?filterQuery=${encodeURIComponent(
        view.filterQuery,
      )}`;
    }
    this.sourceOfTruth.title += ` (${view.name})`;
  }

  sort(fieldName: string, direction: "asc" | "desc" = "asc"): IssueList {
    // Sort the issues by the given field name
    this.issues.sort((a, b) => {
      const aValue = a.field(fieldName);
      const bValue = b.field(fieldName);

      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return this; // Allow method chaining
  }

  sortByEmoji(fieldName: string): IssueList {
    // Sort the issues by the given field name
    // The field is expected to be a status containing an emoji
    // Red comes first
    this.issues.sort((a, b) => {
      const aValue = a.field(fieldName);
      const bValue = b.field(fieldName);

      // If both have the same emoji or neither has it, sort alphabetically
      return emojiCompare(aValue, bValue) ?? aValue.localeCompare(bValue);
    });

    return this;
  }

  groupBy(fieldName: string): IssueList[] {
    // Group the issues by the given field name
    const groups = new Map<string, IssueList>();

    for (const issue of this.issues) {
      const key = issue.field(fieldName);
      if (!groups.has(key)) {
        groups.set(
          key,
          new IssueList([], {
            title: this.sourceOfTruth.title.slice(),
            url: this.sourceOfTruth.url.slice(),
            groupKey: key || title("No " + fieldName),
          }),
        );
      }
      groups.get(key)!.issues.push(issue);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => emojiCompare(a, b) ?? a.localeCompare(b))
      .map(([, group]) => group);
  }

  overallStatus(fieldName: string): string {
    // TODO: Custom sort order in case they don't use emoji
    // Get the max status emoji from the issues
    return this.issues
      .map((issue) => issue.field(fieldName))
      .sort((a, b) => emojiCompare(a, b) ?? a.localeCompare(b))[0];
  }

  // Properties
  get header(): string {
    return `[${this.sourceOfTruth.title}](${this.sourceOfTruth.url})`;
  }

  get title(): string {
    return this.sourceOfTruth.title;
  }

  get url(): string {
    return this.sourceOfTruth.url;
  }

  get groupKey(): string {
    if (!this.sourceOfTruth.groupKey) {
      throw new Error("Don't use groupKey without a groupBy.");
    }
    return this.sourceOfTruth.groupKey;
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
        filterQuery: params.customQuery,
      });
    } else {
      view = await getProjectView(client, params);
    }

    const issueList = await this.forProject(client, {
      organization: params.organization,
      projectNumber: params.projectNumber,
      typeFilter: view.getFilterType(),
    });
    issueList.filter(view);

    return issueList;
  }

  // Render / Memory Functions
  get rendered(): string {
    // IssueLists are Level 2
    return `## ${this.header}\n\n${this.issues.map((issue) => issue.render()).join("\n")}`;
  }

  remember() {
    this.memory.remember(this.rendered);
  }

  render(): string {
    this.remember();
    return this.rendered;
  }
}
