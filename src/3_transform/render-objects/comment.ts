import { CommentWrapper } from "@pull/github/comment";
import type { IssueRenderOptions } from "./issue";

export type RenderedComment = {
  markdown: string;
  sources: string[];
};

export function renderComment(
  comment: CommentWrapper,
  options: IssueRenderOptions,
  headerLevel: number = 4, // Default to Level 4 for Comments
): RenderedComment | undefined {
  // Render a CommentWrapper as a Markdown string
  let markdown = "";
  const sources = [`${comment.url} - ${comment.updatedAt}`];

  if (options.header) {
    markdown += `${"#".repeat(headerLevel)} [Update](${comment.url})\n\n`;
  }

  if (comment.isEmpty) {
    if (options.skipIfEmpty || !options.header) {
      return undefined;
    }
    markdown += "No updates found.";
    return { markdown, sources: [] };
  }

  if (options.author) {
    markdown += `**Update Author:** ${comment.author}\n\n`;
  }

  if (comment.isUpdate) {
    markdown += `${comment._update}`;
  } else {
    markdown += `${comment._body}`;
  }
  markdown += `\n\n`;

  return {
    markdown,
    sources,
  };
}
