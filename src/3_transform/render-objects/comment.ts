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
  if (comment.isEmpty) {
    if (options.skipIfEmpty) {
      return undefined;
    }
    if (options) {
      return { markdown: CommentWrapper.NULL_UPDATE, sources: [] };
    }
  }

  let markdown = `${"#".repeat(headerLevel)} [Update](${comment.url})\n\n`;
  const sources = [`${comment.url} - ${comment.updatedAt}`];

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
