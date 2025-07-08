import { getMemory } from "@transform/memory";
import {
  splitMarkdownByBoldedText,
  splitMarkdownByHeaders,
  stripHtml,
  toSnakeCase,
} from "@util/string";
import { extractUpdate, type Timeframe } from "./update";
import type { IssueWrapper } from "./issue";

export type Comment = {
  author: string;
  body: string;
  createdAt: Date;
  url: string;
};

export class CommentWrapper {
  private memory = getMemory();

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
    // Check if the comment is empty, or has no update
    return (
      this.comment.body.trim() === "" ||
      this.comment.body === CommentWrapper.NULL_UPDATE
    );
  }

  get author(): string {
    return this.comment.author;
  }

  get createdAt(): Date {
    return this.comment.createdAt;
  }

  // Helpers
  hasMarker(marker: RegExp): boolean {
    return marker.test(this.comment.body);
  }

  section(name: string): string | undefined {
    // Get a section of the body by name
    const section = this.sections.get(toSnakeCase(name));
    if (section !== undefined) {
      return stripHtml(section).trim();
    }
    const boldedSection = this.boldedSections.get(toSnakeCase(name));
    if (boldedSection !== undefined) {
      return stripHtml(boldedSection).trim();
    }
    return undefined;
  }

  isWithinTimeframe(timeframe: Timeframe): boolean {
    // Check if the comment was created within the given timeframe
    const now = new Date();
    const createdAt = this.createdAt;

    const day = 86_400_000; // 24 hours in milliseconds

    switch (timeframe) {
      case "all-time":
        return true;
      case "today":
        return now.getTime() - createdAt.getTime() < day;
      case "last-week":
        return now.getTime() - createdAt.getTime() < 7 * day;
      case "last-month":
        return now.getTime() - createdAt.getTime() < 31 * day;
      case "last-year":
        return now.getTime() - createdAt.getTime() < 365 * day;
      default:
        throw new Error(
          `Invalid timeframe for comment filtering: "${timeframe}".`,
        );
    }
  }

  // Render / Memory Functions
  private get rendered(): string {
    // IssueComments are Level 4
    return `#### ${this.header}\n\n${this._body}\n\n`;
  }

  remember() {
    this.memory.remember(this.rendered);
  }

  render(): string {
    this.remember();
    return this.rendered;
  }
}
