import { validateRenderOptions, type DirtyRenderOptions } from "@config";

import { Memory } from "@transform/memory";
import {
  renderDiscussionList,
  type RenderedDiscussionList,
} from "@transform/render-objects/discussion-list";

import { DiscussionWrapper, type Discussion } from "./discussion";
import type { GetDiscussionParameters } from "./graphql/discussion";

type SourceOfTruth = {
  title: string;
  url: string;
};

// TODO: Superclass some shared behavior with IssueList
export class DiscussionList {
  private memory = Memory.getInstance();

  private sourceOfTruth: SourceOfTruth;
  private discussions: DiscussionWrapper[];

  public organization?: string; // All Discussions from the same Org

  // Array-like Methods
  all(): DiscussionWrapper[] {
    return this.discussions;
  }

  filter(
    predicate: (discussion: DiscussionWrapper) => boolean,
  ): DiscussionWrapper[] {
    return this.discussions.filter(predicate);
  }

  get length(): number {
    return this.discussions.length;
  }

  get isEmpty(): boolean {
    return this.discussions.length === 0;
  }

  [Symbol.iterator]() {
    return this.discussions[Symbol.iterator]();
  }

  find(params: GetDiscussionParameters): DiscussionWrapper | undefined {
    return this.discussions.find(
      (discussion) =>
        discussion.organization === params.organization &&
        discussion.repository === params.repository &&
        discussion.number === params.discussionNumber,
    );
  }

  copy(): DiscussionList {
    // Useful to perform multiple inline filters in templates
    const copy = new DiscussionList([], { ...this.sourceOfTruth });
    copy.discussions = [...this.discussions]; // Shallow copy the discussions
    return copy;
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

  // Constructors
  private constructor(discussions: Discussion[], sourceOfTruth: SourceOfTruth) {
    this.sourceOfTruth = sourceOfTruth;
    this.discussions = discussions.map(
      (discussion) => new DiscussionWrapper(discussion),
    );
  }

  static null(): DiscussionList {
    return new DiscussionList([], { title: "No Discussions", url: "" });
  }

  // Updates
  get hasUpdates(): boolean {
    // Check if any Discussion has an Update
    return this.discussions.some((discussion) => discussion.comments.hasUpdate);
  }

  blame(strategiesBlob?: string | string[]): DiscussionList {
    const blameList = this.copy();
    blameList.discussions = blameList.filter((discussion) => {
      const updates = discussion.comments.latestUpdates(1, strategiesBlob);
      return updates.length === 0; // Keep Discussions with no Updates
    });
    blameList.sourceOfTruth.title += " - Stale Updates";
    return blameList;
  }

  // Slack
  async dmAuthors(message: string): Promise<void> {
    await Promise.all(
      this.discussions.map((discussion) => discussion.dmAuthor(message)),
    );
  }

  // Render / Memory Functions
  private _render(
    options?: DirtyRenderOptions,
  ): RenderedDiscussionList | undefined {
    return renderDiscussionList(this, validateRenderOptions(options));
  }

  remember(options?: DirtyRenderOptions) {
    const rendered = this._render(options);
    if (rendered) {
      this.memory.remember({
        content: rendered.markdown,
        sources: rendered.sources,
      });
    }
  }

  render(options?: DirtyRenderOptions): string {
    this.remember(options);
    const rendered = this._render(options);
    if (rendered) {
      return rendered.markdown;
    }
    return "";
  }
}
