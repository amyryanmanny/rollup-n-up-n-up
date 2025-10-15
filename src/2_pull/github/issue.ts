import {
  getConfig,
  isTrueString,
  validateFetchParameters,
  validateRenderOptions,
  type DirtyIssueRenderOptions,
  type IssueFetchParameters,
} from "@config";
import { fuzzy } from "@util/string";

import { Memory } from "@transform/memory";
import { renderIssue, type RenderedIssue } from "@transform/render-objects";

import { CommentWrapper, type Comment } from "./comment";
import { findLatestUpdates } from "./update";
import { IssueList } from "./issue-list";

import {
  getIssue,
  type GetIssueParameters,
  listCommentsForIssue,
  listProjectFieldsForIssue,
} from "./graphql";

import {
  slugifyProjectFieldName,
  type Project,
  type ProjectField,
} from "./project-fields";

import { SlackClient, slackLink } from "@push/slack";

const FOOTER = `This is an automated message from the Rollup-n-up bot from Synapse team. Report any errors in #synapse.`;

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
  comments?: Array<Comment>;
  parent?: {
    title: string;
    url: string;
    number: number;
  };
  project?: Project;
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
    params: GetIssueParameters,
    fetchParams: IssueFetchParameters,
  ): Promise<IssueWrapper> {
    // Create an IssueWrapper for a specific issue
    const issue = await getIssue(params);
    return new IssueWrapper(issue).fetch(fetchParams);
  }

  async fetch(params: IssueFetchParameters): Promise<IssueWrapper> {
    if (params.comments > 0) {
      await this.fetchComments(params.comments);
    }
    if (params.projectFields && this.projectNumber) {
      await this.fetchProjectFields(this.projectNumber);
    }
    if (params.subissues) {
      await this.fetchSubissues(params);
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

  get body(): void {
    this.remember({ body: true, updates: 0, subissues: false });
    // @ts-expect-error: Only call within templates
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

  // Repository
  get repo(): string {
    return this.issue.repository.name;
  }

  get repository(): string {
    return this.issue.repository.name;
  }

  // Organization
  get organization(): string {
    return this.issue.repository.owner;
  }

  get org(): string {
    return this.issue.repository.owner;
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

  get parentTitle(): string {
    if (!this.issue.parent) {
      return "No Parent Issue";
    }
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
        return this.body as unknown as string; // Counts as a valid .body access
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
        return this.parentTitle;
    }

    // Fallback to Project Fields
    if (this._projectFields === undefined) {
      throw new Error(
        `Cannot access "${fieldName}", because Project Fields were not fetched.
        Double check the field name, or set { projectFields: true } in FetchParams.`,
      );
    }

    return this.projectFields.get(slugifyProjectFieldName(fieldName)) || "";
  }

  set project(project: Project) {
    this.issue.project = project;
  }

  get projectNumber(): number | undefined {
    return this.issue.project?.number;
  }

  get _projectFields(): Map<string, ProjectField> | undefined {
    if (this.issue.project === undefined) {
      return undefined;
    }
    return this.issue.project.fields;
  }

  get projectFields(): Map<string, string> {
    // Project Fields of the issue (mapped to string representation for simple interface)
    if (!this._projectFields) {
      return new Map();
    }

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
        const field = this._projectFields?.get(fieldName);
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

  // Fetching
  // Should be called as late as possible, to avoid wasted queries
  private async fetchComments(numComments: number) {
    if (this.issue.comments) {
      return; // Already fetched, probably at the list level
    }
    this.issue.comments = await listCommentsForIssue({
      organization: this.organization,
      repository: this.repository,
      issueNumber: this.number,
      numComments,
    });
  }

  private async fetchProjectFields(projectNumber: number) {
    if (this.issue.project) {
      if (this.issue.project.number === projectNumber) {
        return; // Already fetched
      } else {
        throw new Error(
          `Issue is already associated with Project #${this.issue.project.number}, cannot fetch fields for Project #${projectNumber}.`,
        );
      }
    }

    this.issue.project = {
      organization: this.organization,
      number: projectNumber,
      fields: await listProjectFieldsForIssue({
        organization: this.organization,
        repository: this.repository,
        issueNumber: this.number,
        projectNumber,
      }),
    };
  }

  private async fetchSubissues(params: IssueFetchParameters) {
    const subissues = await IssueList.forSubissues(
      {
        organization: this.organization,
        repository: this.repository,
        issueNumber: this.number,
      },
      validateFetchParameters({
        ...params, // Inherit fetch params
        // Don't recursively fetch Subissues automatically
        subissues: false,
      }),
    );
    if (this.projectNumber) {
      await subissues.fetchProjectFields(this.projectNumber);
    }
    this.subissues = subissues;
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

  set comments(comments: Comment[]) {
    this.issue.comments = comments;
  }

  get latestComment(): CommentWrapper {
    const comments = this.comments;

    if (comments.length !== 0) {
      return comments[0] as CommentWrapper;
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
      return updates[0] as CommentWrapper;
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

  // Slack
  async dmAssignees(message: string): Promise<void> {
    const slack = new SlackClient();

    message = `Regarding the Issue ${slackLink(this.url, this.title)}:\n${message}\n_${FOOTER}_`;

    await Promise.all(
      this.assignees.map((assignee) => {
        // Log the DMs since it's an important operation
        console.log(
          `Sending Slack DM to @${assignee} about Issue ${this.header}`,
        );
        return slack.sendDm(assignee, message);
      }),
    );
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
