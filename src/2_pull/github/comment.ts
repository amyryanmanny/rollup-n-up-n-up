import { validateRenderOptions, type DirtyRenderOptions } from "@config";

import { ONE_DAY } from "@util/date";
import { extractEmoji } from "@util/emoji";
import {
  extractDataBlocks,
  firstHeader,
  splitMarkdownByBoldedText,
  splitMarkdownByHeaders,
  stripHtml,
  toSnakeCase,
} from "@util/string";

import { Memory } from "@transform/memory";
import { renderComment, type RenderedComment } from "@transform/render-objects";

import type { IssueWrapper } from "./issue";
import type { DiscussionWrapper } from "./discussion";

import { extractUpdate, type Timeframe } from "./update-detection";

export type Comment = {
  id: number;
  author: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  url: string;
};

export class CommentWrapper {
  private memory = Memory.getInstance();

  private comment: Comment;
  public parent: IssueWrapper | DiscussionWrapper;

  private sections: Map<string, string>;
  private boldedSections: Map<string, string>;
  private dataBlocks: Map<string, string>;

  constructor(parent: IssueWrapper | DiscussionWrapper, comment: Comment) {
    // Call it parent, also support Discussion since there's big overlap
    this.parent = parent;
    this.comment = comment;

    this.sections = splitMarkdownByHeaders(comment.body);
    this.boldedSections = splitMarkdownByBoldedText(comment.body);
    this.dataBlocks = extractDataBlocks(comment.body);
  }

  // Properties
  get title(): string {
    const header = firstHeader(this.comment.body);
    return header || "Update";
  }

  get header(): string {
    return `[${this.title}](${this.url})`;
  }

  get id(): number {
    return this.comment.id;
  }

  get url(): string {
    return this.comment.url;
  }

  get _body(): string {
    // Return processed body of the comment
    return stripHtml(this.comment.body).trim();
  }

  get body(): void {
    this.remember();
    // @ts-expect-error: Only call within templates
    return this._body;
  }

  get _update(): string {
    return extractUpdate(this) || this._body;
  }

  get update(): void {
    this.remember();
    // @ts-expect-error: Only call within templates
    return this._update;
  }

  get isEmpty(): boolean {
    // Check if the body is empty
    return this._body === "";
  }

  get isUpdate(): boolean {
    // Check if the comment is an update
    return extractUpdate(this) !== undefined;
  }

  get author(): string {
    return this.comment.author;
  }

  get createdAt(): Date {
    return this.comment.createdAt;
  }

  get updatedAt(): Date {
    return this.comment.updatedAt;
  }

  // Timeframe
  wasPostedSince(daysAgo: number): boolean {
    return new Date().getTime() - this.createdAt.getTime() < daysAgo * ONE_DAY;
  }

  wasUpdatedSince(daysAgo: number): boolean {
    return new Date().getTime() - this.updatedAt.getTime() < daysAgo * ONE_DAY;
  }

  get wasPostedToday(): boolean {
    return this.wasPostedSince(1);
  }

  get wasPostedThisWeek(): boolean {
    return this.wasPostedSince(7);
  }

  get wasPostedThisMonth(): boolean {
    return this.wasPostedSince(31);
  }

  get wasPostedThisYear(): boolean {
    return this.wasPostedSince(365);
  }

  get wasUpdatedToday(): boolean {
    return this.wasUpdatedSince(1);
  }

  get wasUpdatedThisWeek(): boolean {
    return this.wasUpdatedSince(7);
  }

  get wasUpdatedThisMonth(): boolean {
    return this.wasUpdatedSince(31);
  }

  get wasUpdatedThisYear(): boolean {
    return this.wasUpdatedSince(365);
  }

  isWithinTimeframe(timeframe: Timeframe): boolean {
    // Check if the comment was created within the given Timeframe
    switch (timeframe) {
      case "all-time":
        return true;
      case "today":
        return this.wasPostedToday;
      case "last-week":
        return this.wasPostedThisWeek;
      case "last-month":
        return this.wasPostedThisMonth;
      case "last-year":
        return this.wasPostedThisYear;
      default:
        throw new Error(
          `Invalid Timeframe for Comment filtering: "${timeframe}".`,
        );
    }
  }

  // Helpers
  hasMarker(marker: RegExp): boolean {
    return marker.test(this.comment.body);
  }

  section(name: string): string | undefined {
    // Get a section of the body by name
    name = toSnakeCase(name);

    const dataBlock = this.dataBlocks.get(name);
    if (dataBlock !== undefined) {
      return stripHtml(dataBlock).trim();
    }
    const section = this.sections.get(name);
    if (section !== undefined) {
      return stripHtml(section).trim();
    }
    const boldedSection = this.boldedSections.get(name);
    if (boldedSection !== undefined) {
      return stripHtml(boldedSection).trim();
    }

    return undefined;
  }

  emojiStatus(sections?: string | string[]): string | undefined {
    // Extract a status emoji from the body
    if (this.isEmpty) {
      return undefined;
    }
    if (typeof sections === "string") {
      sections = [sections];
    }
    if (sections) {
      for (const sectionName of sections) {
        const section = this.section(sectionName);
        if (section) {
          const emoji = extractEmoji(section);
          if (emoji) return emoji;
        }
      }
    }
    // If no sections provided, or couldn't be found, search entire body
    return extractEmoji(this.comment.body);
  }

  // Render / Memory Functions
  private _render(options?: DirtyRenderOptions): RenderedComment | undefined {
    return renderComment(this, validateRenderOptions(options));
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
    if (rendered === undefined) {
      return "";
    }
    // Return the rendered markdown string
    return rendered.markdown;
  }
}
