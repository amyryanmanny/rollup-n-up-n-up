import {
  getConfig,
  isTrueString,
  validateRenderOptions,
  type DirtyIssueRenderOptions,
  type FetchParameters,
} from "@config";
import { fuzzy } from "@util/string";

import { Memory } from "@transform/memory";
import { renderIssue, type RenderedIssue } from "@transform/render-objects";

import { CommentWrapper, type Comment } from "./comment";
import { findLatestUpdates } from "./update";
import { IssueList } from "./issue-list";

import { getIssue, type GetIssueParameters } from "./graphql/issue";
import {
  slugifyProjectFieldName,
  type IssueField,
} from "./graphql/fragments/project-fields";

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
  parent?: {
    title: string;
    url: string;
    number: number;
  };
  project?: {
    number: number;
    fields: Map<string, IssueField>;
  };
  isSubissue?: boolean;
};

export class IssueWrapper {
  private memory = Memory.getInstance();

  private issue: Issue;
  public subissues: IssueList | undefined;

  constructor(issue: Issue) {
    this.issue = issue;
  }

  static async forIssue(
    params: GetIssueParameters & FetchParameters,
  ): Promise<IssueWrapper> {
    // Create an IssueWrapper for a specific issue
    const issue = await getIssue(params);
    return new IssueWrapper(issue).fetch(params);
  }

  async fetch(params: FetchParameters): Promise<IssueWrapper> {
    if (params.subissues) {
      await this.fetchSubissues();
    }
    return this;
  }

  // Properties
  get header(): string {
    return `[${this.title}](${this.url})`;
  }

  get title(): string {
    return this.issue.title.trim();
  }

  get _body(): string {
    return this.issue.body || "";
  }

  get body(): string {
    this.remember({ body: true });
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
    return this.issue.isSubissue || false;
  }

  get createdAt(): Date {
    return this.issue.createdAt;
  }

  get updatedAt(): Date {
    return this.issue.updatedAt;
  }

  get type(): string {
    if (this.isSubissue) {
      return "Subissue";
    }
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

  get parentTitle(): string | undefined {
    return this.issue.parent?.title;
  }

  // Fields
  field(fieldName: string): string {
    // Return the value of a field by name
    switch (fuzzy(fieldName)) {
      case fuzzy("title"):
        return this.title;
      case fuzzy("url"):
        return this.url;
      case fuzzy("number"):
        return String(this.number);
      case fuzzy("body"):
        return this.body;
      case fuzzy("type"):
        return this.type;
      case fuzzy("repo"):
      case fuzzy("repository"):
        return this.repo;
      case fuzzy("org"):
      case fuzzy("organization"):
      case fuzzy("owner"):
        return this.owner;
      case fuzzy("full_name"):
      case fuzzy("name_with_owner"):
      case fuzzy("repo_name_with_owner"):
        return this.repoNameWithOwner;
      case fuzzy("parent"):
      case fuzzy("parent_issue"):
      case fuzzy("parent_title"):
        return this.parentTitle || "";
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
      if (isTrueString(emojiOverride)) {
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
  private async fetchSubissues() {
    this.subissues = await IssueList.forSubissues({
      owner: this.owner,
      repo: this.repo,
      issueNumber: this.number,
      subissues: false, // Don't recursively fetch subissues
      projectNumber: this.projectNumber, // Fetch ProjectFields for subissues of a project issue
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
    if (updates !== undefined && updates.length > 0) {
      return updates;
    }
    return [CommentWrapper.empty(this)];
  }

  get hasUpdate(): boolean {
    return !this.latestUpdate.isEmpty;
  }

  // Render / Memory Functions
  private _render(options: DirtyIssueRenderOptions): RenderedIssue | undefined {
    return renderIssue(this, validateRenderOptions(options));
  }

  remember(options: DirtyIssueRenderOptions = {}) {
    const rendered = this._render(options);
    if (rendered) {
      this.memory.remember({
        content: rendered.markdown,
        sources: rendered.sources,
      });
    }
  }

  render(options: DirtyIssueRenderOptions = {}): string {
    this.remember(options);
    const rendered = this._render(options);
    if (rendered) {
      return rendered.markdown;
    }
    return "";
  }
}
