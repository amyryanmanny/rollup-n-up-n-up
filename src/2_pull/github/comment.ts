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

  static empty(issueUrl: string): CommentWrapper {
    return new CommentWrapper("", {
      author: "",
      body: "No updates found",
      createdAt: new Date(0),
      url: issueUrl,
    });
  }

  // Properties
  get header(): string {
    return `[${this.issueTitle}](${this.url})`;
  }

  get url(): string {
    return this.comment.url;
  }

  private get _body(): string {
    // Return processed body of the comment
    return stripHtml(this.comment.body).trim();
  }

  get body(): string {
    this.remember();
    return this._body;
  }

  get update(): string {
    const update = this.findUpdate();
    if (update) {
      return update;
    }
    // If no update section, just return the body
    return this.body;
  }

  get author(): string {
    return this.comment.author;
  }

  get createdAt(): Date {
    return this.comment.createdAt;
  }

  // Helpers
  get hasUpdateMarker(): boolean {
    // Check if the comment body contains the update marker
    return CommentWrapper.UPDATE_MARKER.test(this.comment.body);
  }

  removeUpdateMarker() {
    this.comment.body = this.comment.body.replaceAll(
      CommentWrapper.UPDATE_MARKER,
      "",
    );
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

  findUpdate(): string | undefined {
    // TODO: Configurable
    // Find the update section in the comment
    for (const sections of ["update"]) {
      const section = this.section(sections);
      if (section !== undefined) {
        return section;
      }
    }
    return undefined;
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
