import { getMemory } from "@transform/memory";

import { type ProjectField } from "./graphql/project";
import { CommentWrapper, type Comment } from "./comment";
import { findLatestUpdate } from "./update";
import { IssueList } from "./issue-list";

// Interface
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

export class IssueWrapper {
  private memory = getMemory();

  private issue: Issue;

  constructor(issue: Issue) {
    this.issue = issue;
  }

  get hasUpdate(): boolean {
    return !this.latestUpdate.isEmpty;
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
    // TODO: Memoize with CommentList
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

  get latestComment(): CommentWrapper {
    const comments = this.comments;

    if (comments.length !== 0) {
      return comments[0];
    }

    return CommentWrapper.empty(this.url);
  }

  get latestUpdate(): CommentWrapper {
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
