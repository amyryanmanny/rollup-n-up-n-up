import { UpdateDetection } from "@config";

import { type Comment, CommentWrapper } from "./comment";
import type { IssueWrapper } from "./issue";
import type { DiscussionWrapper } from "./discussion";

import {
  findLatestUpdates,
  type UpdateDetectionStrategy,
} from "./update-detection";

export class CommentList {
  private parent: IssueWrapper | DiscussionWrapper;
  private comments: CommentWrapper[];

  private _latestUpdate: CommentWrapper | undefined; // Cached property

  constructor(parent: IssueWrapper | DiscussionWrapper, comments: Comment[]) {
    this.parent = parent;
    this.comments = comments
      .map((comment) => new CommentWrapper(parent, comment))
      .sort((a, b) => {
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
    const copy = new CommentList(this.parent, []);
    copy.comments = [...this.comments];
    return copy;
  }

  // Properties
  get header(): string {
    return `[${this.parent.title}](${this.parent.url})`;
  }

  get url(): string {
    return this.parent.url;
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
    if (strategiesBlob === undefined) {
      this._latestUpdate = updates[0];
    }
    return updates;
  }

  get hasUpdate(): boolean {
    return this.latestUpdate !== undefined;
  }
}
