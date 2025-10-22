import { UpdateDetection } from "@util/config";
import { type Comment, CommentWrapper } from "./comment";
import type { IssueWrapper } from "./issue";
import { findLatestUpdates, type UpdateDetectionStrategy } from "./update";

export class CommentList {
  private issue: IssueWrapper;
  private comments: CommentWrapper[];

  private _latestUpdate: CommentWrapper | undefined; // Cached property

  constructor(issue: IssueWrapper, comments: Comment[]) {
    this.issue = issue;
    this.comments = comments.map(
      (comment) => new CommentWrapper(issue, comment),
    );
    this.comments.sort((a, b) => {
      // Sort comments by createdAt in descending order
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  // Array-like methods
  all(): CommentWrapper[] {
    return this.comments;
  }

  filter(predicate: (comment: CommentWrapper) => boolean): CommentWrapper[] {
    return this.comments.filter(predicate);
  }

  get length(): number {
    return this.comments.length;
  }

  get isEmpty(): boolean {
    return this.comments.length === 0;
  }

  [Symbol.iterator]() {
    return this.comments[Symbol.iterator]();
  }

  copy(): CommentList {
    const copy = new CommentList(this.issue, []);
    copy.comments = [...this.comments];
    return copy;
  }

  // Properties
  get header(): string {
    return `[${this.issue.title}](${this.issue.url})`;
  }

  get url(): string {
    return this.issue.url;
  }

  // Comments
  get latestComment(): CommentWrapper | undefined {
    return this.all()[0];
  }

  latestComments(n: number): CommentWrapper[] {
    return this.all().slice(0, n);
  }

  // Updates
  get latestUpdate(): CommentWrapper | undefined {
    if (this._latestUpdate === undefined) {
      const updates = findLatestUpdates(this.all(), 1);
      this._latestUpdate = updates[0];
    }
    return this._latestUpdate;
  }

  latestUpdates(
    n: number,
    strategiesBlob?: string | string[],
  ): CommentWrapper[] {
    let strategies: UpdateDetectionStrategy[] | undefined;
    if (strategiesBlob) {
      strategies = UpdateDetection.parseStrategies(strategiesBlob);
    }
    const updates = findLatestUpdates(this.all(), n, strategies);
    this._latestUpdate = updates[0];
    return updates;
  }

  get hasUpdate(): boolean {
    return this.latestUpdate !== undefined;
  }
}
