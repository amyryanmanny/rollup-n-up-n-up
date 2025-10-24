import { Memory } from "@transform/memory";
import type { Comment } from "./comment";

import {
  getDiscussion,
  type GetDiscussionParameters,
} from "./graphql/discussion";
import {
  renderDiscussion,
  type RenderedDiscussion,
} from "@transform/render-objects";
import { validateRenderOptions, type DirtyRenderOptions } from "@util/config";
import { CommentList } from "./comment-list";

export type Discussion = {
  title: string;
  body: string;
  url: string;
  number: number;
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
  repository: {
    name: string;
    owner: string;
    nameWithOwner: string;
  };
  author: string;
  labels: string[];
  comments: Array<Comment>;
};

export class DiscussionWrapper {
  private memory = Memory.getInstance();

  private discussion: Discussion;
  private commentList?: CommentList;

  private constructor(discussion: Discussion) {
    this.discussion = discussion;
  }

  static async forDiscussion(
    params: GetDiscussionParameters,
  ): Promise<DiscussionWrapper> {
    const discussion = await getDiscussion(params);
    return new DiscussionWrapper(discussion);
  }

  // Properties
  get header(): string {
    return `[${this.title}](${this.url})`;
  }

  get title(): string {
    return this.discussion.title.trim();
  }

  get _body(): string {
    return this.discussion.body.trim();
  }

  get body(): void {
    this.remember({ body: true, updates: 0, subissues: false });
    // @ts-expect-error: Only call within templates
    return this._body;
  }

  get url(): string {
    return this.discussion.url;
  }

  get number(): number {
    return this.discussion.number;
  }

  get isOpen(): boolean {
    return this.discussion.isOpen;
  }

  get createdAt(): Date {
    return this.discussion.createdAt;
  }

  get updatedAt(): Date {
    return this.discussion.updatedAt;
  }

  // Repository
  get repo(): string {
    return this.discussion.repository.name;
  }

  get repository(): string {
    return this.discussion.repository.name;
  }

  // Organization
  get organization(): string {
    return this.discussion.repository.owner;
  }

  get org(): string {
    return this.discussion.repository.owner;
  }

  get owner(): string {
    return this.discussion.repository.owner;
  }

  get repoNameWithOwner(): string {
    return this.discussion.repository.nameWithOwner;
  }

  get author(): string {
    return this.discussion.author;
  }

  get labels(): string[] {
    return this.discussion.labels.map((label) => label.trim());
  }

  // Comments
  get comments(): CommentList {
    if (!this.commentList) {
      const comments = this.discussion.comments || [];
      this.commentList = new CommentList(this, comments);
    }
    return this.commentList;
  }

  set comments(comments: Comment[]) {
    this.discussion.comments = comments;
    this.commentList = undefined; // Invalidate cache
  }

  // Render / Memory Functions
  private _render(options: DirtyRenderOptions): RenderedDiscussion | undefined {
    return renderDiscussion(this, validateRenderOptions(options));
  }

  remember(options: DirtyRenderOptions = {}) {
    const rendered = this._render(options);
    if (rendered) {
      this.memory.remember({
        content: rendered.markdown,
        sources: rendered.sources,
      });
    }
  }

  render(options: DirtyRenderOptions = {}): string {
    this.remember(options);
    const rendered = this._render(options);
    if (rendered) {
      return rendered.markdown;
    }
    return "";
  }
}
