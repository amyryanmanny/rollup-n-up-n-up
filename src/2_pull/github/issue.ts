import { GitHubClient } from "./client";
import { getMemory } from "@transform/memory";
import { emojiCompare } from "@util/emoji";
import { title } from "@util/string";

import {
  listIssuesForProject,
  type ListIssuesForProjectParameters,
  type ProjectField,
} from "./project";
import {
  getProjectView,
  ProjectView,
  type GetProjectViewParameters,
} from "./project-view";
import { CommentWrapper, type Comment } from "./comment";
import { findLatestUpdate } from "./update";
import {
  listIssuesForRepo,
  type ListIssuesForRepoParameters,
} from "./graphql/repo";

// Interface
type SourceOfTruth = {
  title: string;
  url: string;
  groupKey?: string; // When using a groupBy
};

export type Issue = {
  title: string;
  body: string;
  url: string;
  number: number;
  assignees: string[];
  type: string;
  repository: {
    name: string;
    owner: string;
    nameWithOwner: string;
  };
  comments: Array<Comment>;
  projectFields?: Map<string, ProjectField>;
};

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

  get number(): number {
    return this.issue.number;
  }

  private get _body(): string {
    return this.issue.body || "";
  }

  get body(): string {
    this.remember();
    return this._body;
  }

  get type(): string {
    return this.issue.type;
  }

  get repo(): string {
    return this.issue.repository.name;
  }

  get owner(): string {
    return this.issue.repository.owner;
  }

  get repoNameWithOwner(): string {
    return this.issue.repository.nameWithOwner;
  }

  // Fields
  field(fieldName: string): string | null {
    // Return the value of the field by name
    const insensitiveFieldName = fieldName
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace("_", "");
    switch (insensitiveFieldName) {
      case "TITLE":
        return this.title;
      case "URL":
        return this.url;
      case "NUMBER":
        return String(this.number);
      case "BODY":
        return this.body;
      case "TYPE":
        return this.type;
      case "REPO":
      case "REPOSITORY":
        return this.repo;
      case "ORG":
      case "ORGANIZATION":
      case "OWNER":
        return this.owner;
      case "FULLNAME":
      case "NAMEWITHOWNER":
      case "REPONAMEWITHOWNER":
        return this.repoNameWithOwner ?? "";
    }

    // Fallback to projectFields
    // TODO: Handle case insensitivity here too
    const projectField = this._projectFields.get(fieldName)?.value;
    return projectField || "";
  }

  get _projectFields(): Map<string, ProjectField> {
    // Internal Method - return issue projectFields
    // For Issues pulled from a Repo, projectFields are undefined
    return this.issue.projectFields ?? new Map<string, ProjectField>();
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

    // TODO: Create a CommentList to perform this logic
    const sortCommentsByDateDesc = (a: CommentWrapper, b: CommentWrapper) => {
      // Sort comments by createdAt in descending order
      return b.createdAt.getTime() - a.createdAt.getTime();
    };

    return (issue.comments as Comment[])
      .map((comment) => new CommentWrapper(issue.title, comment))
      .sort(sortCommentsByDateDesc); // Newest comments first
  }

  latestComment(): CommentWrapper {
    const comments = this.comments;

    if (comments.length !== 0) {
      return comments[0];
    }

    return CommentWrapper.empty(this.url);
  }

  latestUpdate(): CommentWrapper {
    const comments = this.comments;

    if (comments.length !== 0) {
      const update = findLatestUpdate(comments);
      if (update !== undefined) {
        return update;
      }
    }

    return CommentWrapper.empty(this.url);
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

  // Some Array functions should fall through
  get length(): number {
    return this.issues.length;
  }

  [Symbol.iterator]() {
    return this.issues[Symbol.iterator]();
  }

  find(predicate: (issue: IssueWrapper) => boolean): IssueWrapper | undefined {
    // Find an issue by a predicate
    return this.issues.find(predicate);
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
    const response = await listIssuesForRepo(client, params);
    const { issues, title, url } = response;
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
