import { CommentWrapper } from "@pull/github/comment";

export type CommentRenderOptions = {
  header: boolean;
  body: boolean;
  author: boolean;
  skipIfEmpty: boolean; // Skip rendering if no content
};

export type RenderedComment = {
  markdown: string;
  sources: string[];
};

export function renderComment(
  comment: CommentWrapper,
  options: CommentRenderOptions,
  headerLevel: number = 4, // Default to Level 4 for Comments
): RenderedComment | undefined {
  // Render a CommentWrapper as a Markdown string
  let markdown = "";
  const sources = [`${comment.url} - ${comment.updatedAt}`];

  if (options.header && comment.url) {
    markdown += `${"#".repeat(headerLevel)} ${comment.header}\n\n`;
  }

  if (options.author && comment.author) {
    markdown += `**Update Author:** ${comment.author}\n\n`;
  }

  if (comment.isUpdate) {
    markdown += `${comment._update}`;
  } else {
    markdown += `${comment._body}`;
  }

  if (markdown.trim() === "") {
    if (options.skipIfEmpty) {
      return undefined;
    }
    markdown += "No Updates found.";
    return { markdown, sources: [] };
  }

  markdown += `\n\n`;

  return {
    markdown,
    sources,
  };
}
