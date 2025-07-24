import { Memory } from "@transform/memory";
import { ONE_DAY } from "@util/date";
import { extractEmoji } from "@util/emoji";
import {
  splitMarkdownByBoldedText,
  splitMarkdownByHeaders,
  stripHtml,
  toSnakeCase,
} from "@util/string";

import type { IssueWrapper } from "./issue";
import { extractUpdate, type Timeframe } from "./update";

export type Comment = {
  author: string;
  body: string;
  createdAt: Date;
  url: string;
};

export class CommentWrapper {
  private memory = Memory.getInstance();

  static NULL_UPDATE = "No updates found";

  private comment: Comment;
  public issue: IssueWrapper;

  private sections: Map<string, string>;
  private boldedSections: Map<string, string>;

  constructor(issue: IssueWrapper, comment: Comment) {
    // TODO: Move this.issue onto CommentList class instead
    // Call it parent, also support Dicussion since there's big overlap
    this.issue = issue;
    this.comment = comment;

    this.sections = splitMarkdownByHeaders(comment.body);
    this.boldedSections = splitMarkdownByBoldedText(comment.body);
  }

  static empty(issue: IssueWrapper): CommentWrapper {
    return new CommentWrapper(issue, {
      author: "",
      body: CommentWrapper.NULL_UPDATE,
      createdAt: new Date(0),
      url: issue.url,
    });
  }

  // Properties
  get header(): string {
    return `[${this.issue.title}](${this.url})`;
  }

  get url(): string {
    return this.comment.url;
  }

  get _body(): string {
    // Return processed body of the comment
    return stripHtml(this.comment.body).trim();
  }

  get body(): string {
    this.remember();
    return this._body;
  }

  get update(): string | undefined {
    this.remember();
    return extractUpdate(this);
  }

  get isEmpty(): boolean {
    // Check if the comment body is empty or null
    return (
      this.comment.body.trim() === "" ||
      this.comment.body === CommentWrapper.NULL_UPDATE
    );
  }

  get isUpdate(): boolean {
    // Check if the comment is an update
    return !this.isEmpty && this.update !== undefined;
  }

  get author(): string {
    return this.comment.author;
  }

  get createdAt(): Date {
    return this.comment.createdAt;
  }

  // Date Properties
  get wasPostedToday(): boolean {
    return new Date().getTime() - this.createdAt.getTime() < ONE_DAY;
  }

  get wasPostedThisWeek(): boolean {
    return new Date().getTime() - this.createdAt.getTime() < 7 * ONE_DAY;
  }

  get wasPostedThisMonth(): boolean {
    return new Date().getTime() - this.createdAt.getTime() < 31 * ONE_DAY;
  }

  get wasPostedThisYear(): boolean {
    return new Date().getTime() - this.createdAt.getTime() < 365 * ONE_DAY;
  }

  // Helpers
  hasMarker(marker: RegExp): boolean {
    return marker.test(this.comment.body);
  }

  section(name: string): string | undefined {
    // Get a section of the body by name
    name = toSnakeCase(name);
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

  isWithinTimeframe(timeframe: Timeframe): boolean {
    // Check if the comment was created within the given timeframe
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
          `Invalid timeframe for comment filtering: "${timeframe}".`,
        );
    }
  }

  emojiStatus(sections?: string[]): string | undefined {
    // Extract a status emoji from the comment body
    if (this.isEmpty) {
      return undefined;
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
  get rendered(): string {
    // IssueComments are Level 4
    return `#### Comment on ${this.issue.type}: ${this.header}\n\n${this._body}\n\n`;
  }

  remember() {
    this.memory.remember(this.rendered);
  }

  render(): string {
    this.remember();
    return this.rendered;
  }
}
