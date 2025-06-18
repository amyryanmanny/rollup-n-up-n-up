import { getMemory } from "@transform/memory";
import {
  splitMarkdownByBoldedText,
  splitMarkdownByHeaders,
  stripHtml,
  toSnakeCase,
} from "@util/string";

export type ProjectIssueComment = {
  author: string;
  body: string;
  createdAt: Date;
  url: string;
};
export type Comment = ProjectIssueComment;

export class CommentWrapper {
  private memory = getMemory();

  static UPDATE_MARKER = RegExp(/<(!--\s*UPDATE\s*--)>/g); // TODO: Custom marker as input

  private comment: Comment;
  private issueTitle: string;

  private sections: Map<string, string>;
  private boldedSections: Map<string, string>;

  constructor(issueTitle: string, comment: Comment) {
    this.issueTitle = issueTitle;
    this.comment = comment;

    this.sections = splitMarkdownByHeaders(comment.body);
    this.boldedSections = splitMarkdownByBoldedText(comment.body);
  }

  static empty(): CommentWrapper {
    return new CommentWrapper("", {
      author: "",
      body: "No updates found",
      createdAt: new Date(0),
      url: "",
    });
  }

  // Properties
  get header(): string {
    return `[${this.issueTitle}](${this.comment.url})`;
  }

  get author(): string {
    return this.comment.author;
  }

  get dirtyBody(): string {
    // Return the raw body of the comment
    return this.comment.body;
  }

  get body(): string {
    // Return processed body of the comment
    return stripHtml(this.comment.body).trim();
  }

  get createdAt(): Date {
    return this.comment.createdAt;
  }

  // Helpers
  removeUpdateMarker() {
    this.comment.body = this.comment.body.replaceAll(
      CommentWrapper.UPDATE_MARKER,
      "",
    );
  }

  getSection(name: string): string | undefined {
    // Get the section by name
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

  get update(): string {
    // Get the update section
    const updateSection = this.getSection("update");
    if (updateSection) {
      return updateSection;
    }
    // If no update section, return the body
    return this.body;
  }

  get trendingReason(): string {
    // Get the trending reason section
    const trendingReason = this.getSection("trending_reason");
    if (trendingReason) {
      return trendingReason;
    }
    // If no trending reason section, return the Update
    return this.update;
  }

  // Render / Memory Functions
  remember(bankIndex: number = 0) {
    this.memory.remember(
      `## Comment on ${this.issueTitle}:\n\n${this.comment.body}`,
      bankIndex,
    );
  }

  renderBody(memoryBankIndex: number = 0): string {
    this.remember(memoryBankIndex);
    return this.body;
  }

  renderUpdate(memoryBankIndex: number = 0): string {
    this.remember(memoryBankIndex);
    return this.update;
  }
}
