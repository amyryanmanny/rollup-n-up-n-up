import { Memory } from "@transform/memory";
import { getConfig, isTrueValue } from "@util/config";

import { slugifyProjectFieldName, type IssueField } from "./graphql/project";
import { CommentWrapper, type Comment } from "./comment";
import { findLatestUpdates } from "./update";
import { IssueList } from "./issue-list";
import { getIssue, type GetIssueParameters } from "./graphql/issue";

// Interface
export type Issue = {
  title: string;
  body: string;
  url: string;
  number: number;
  state: "OPEN" | "CLOSED";
  createdAt: Date;
  updatedAt: Date;
  type: string;
  repository: {
    name: string;
    owner: string;
    nameWithOwner: string;
  };
  assignees: string[];
  labels: string[];
  comments: Array<Comment>;
  isSubissue: boolean; // If this is a subissue of another issue
  project?: {
    number: number;
    fields: Map<string, IssueField>;
  };
};

export class IssueWrapper {
  private memory = Memory.getInstance();

  private issue: Issue;

  constructor(issue: Issue) {
    this.issue = issue;
  }

  static async forIssue(params: GetIssueParameters): Promise<IssueWrapper> {
    // Create an IssueWrapper for a specific issue
    const issue = await getIssue(params);
    return new IssueWrapper(issue);
  }

  // Properties
  get header(): string {
    return `[${this.title}](${this.url})`;
  }

  get title(): string {
    return this.issue.title.trim();
  }

  private get _body(): string {
    return this.issue.body || "";
  }

  get body(): string {
    this.remember();
    return this._body;
  }

  get url(): string {
    return this.issue.url;
  }

  get number(): number {
    return this.issue.number;
  }

  get isOpen(): boolean {
    return this.issue.state === "OPEN";
  }

  get isSubissue(): boolean {
    return this.issue.isSubissue;
  }

  get createdAt(): Date {
    return this.issue.createdAt;
  }

  get updatedAt(): Date {
    return this.issue.updatedAt;
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

  get assignees(): string[] {
    return this.issue.assignees.map((assignee) => assignee.trim());
  }

  get labels(): string[] {
    return this.issue.labels.map((label) => label.trim());
  }

  // Fields
  field(fieldName: string): string {
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
    return this.projectFields.get(slugifyProjectFieldName(fieldName)) || "";
  }

  get projectNumber(): number | undefined {
    return this.issue.project?.number;
  }

  get _projectFields(): Map<string, IssueField> {
    // Internal Method - return issue projectFields
    // For Issues pulled from a Repo, projectFields are undefined
    return this.issue.project?.fields ?? new Map<string, IssueField>();
  }

  get projectFields(): Map<string, string> {
    // Return the projectFields of the issue, mapped back to string representation
    return new Map(
      Array.from(this._projectFields.entries()).map(([name, field]) => {
        switch (field.kind) {
          case "SingleSelect":
          case "Date":
            return [name, field.value ?? ""];
          case "MultiSelect": // Doesn't really exist but included for completeness
            return [name, (field.values || []).join(", ")];
        }
      }),
    );
  }

  status(fieldName: string): string {
    // Return the status of the issue by field name
    const emojiOverride = getConfig("EMOJI_OVERRIDE");
    if (emojiOverride) {
      // If EMOJI_OVERRIDE is set, check the body of an update for an emoji
      const update = this.latestUpdate;
      let emojiSections: string[];
      if (isTrueValue(emojiOverride)) {
        emojiSections = []; // If just set to true, search entire body
      } else {
        // If set to a comma-separated list, search those sections
        emojiSections = emojiOverride.split(",").map((s) => s.trim());
      }
      const emoji = update.emojiStatus(emojiSections);
      if (emoji) {
        const field = this._projectFields.get(fieldName);
        if (field && field.kind === "SingleSelect") {
          // Try to match to ProjectFieldValue for parity
          for (const option of field?.options || []) {
            if (option.includes(emoji)) {
              // Return first option with matching emoji - Small false positive risk
              return option;
            }
          }
        } else {
          return emoji;
        }
      }
    }
    const value = this.field(fieldName);
    if (!value) {
      return "No Status";
    }
    return value;
  }

  // Subissues
  async subissues(): Promise<IssueList> {
    return IssueList.forSubissues({
      owner: this.owner,
      repo: this.repo,
      issueNumber: this.number,
    });
  }

  // Comment
  get comments(): CommentWrapper[] {
    // TODO: Replace with CommentList property
    // TODO: Sorting should be done in CommentList constructor
    const sortCommentsByDateDesc = (a: CommentWrapper, b: CommentWrapper) => {
      // Sort comments by createdAt in descending order
      return b.createdAt.getTime() - a.createdAt.getTime();
    };

    return (this.issue.comments as Comment[])
      .map((comment) => new CommentWrapper(this, comment))
      .sort(sortCommentsByDateDesc); // Newest comments first
  }

  get latestComment(): CommentWrapper {
    const comments = this.comments;

    if (comments.length !== 0) {
      return comments[0];
    }
    return CommentWrapper.empty(this);
  }

  latestComments(n: number): CommentWrapper[] {
    const comments = this.comments;

    if (comments.length !== 0) {
      return comments.slice(0, n);
    }
    return [CommentWrapper.empty(this)];
  }

  get latestUpdate(): CommentWrapper {
    const updates = findLatestUpdates(this.comments);
    if (updates !== undefined) {
      return updates[0];
    }
    return CommentWrapper.empty(this);
  }

  latestUpdates(n: number): CommentWrapper[] {
    const updates = findLatestUpdates(this.comments, n);
    if (updates !== undefined) {
      return updates;
    }
    return [CommentWrapper.empty(this)];
  }

  get hasUpdate(): boolean {
    return !this.latestUpdate.isEmpty;
  }

  // Render / Memory Functions
  get rendered(): string {
    // Issues are Level 3
    // Subissues are Level 4
    const rendered = !this.isSubissue
      ? `### ${this.type}: ${this.header}`
      : `#### Subissue / ${this.type}: ${this.header}`;

    // Include the latest update if it exists
    const update = this.latestUpdate;
    if (update.isEmpty) {
      return rendered;
    }

    return `${rendered}\n\n${update.rendered}`;
  }

  remember() {
    this.memory.remember({ content: this.rendered, source: this.url });
  }

  render(): string {
    this.remember();
    return this.rendered;
  }
}
