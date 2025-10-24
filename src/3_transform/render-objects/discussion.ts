import type { DiscussionWrapper } from "@pull/github/discussion";

import { renderComment } from "./comment";

export type DiscussionRenderOptions = {
  header: boolean;
  body: boolean;
  updates: number;
  author: boolean; // Author of the update, not the issue
  createdAt: boolean;
  updatedAt: boolean;
  skipIfEmpty: boolean; // Skip rendering if no updates or body
};

export type RenderedDiscussion = {
  markdown: string;
  sources: string[];
};

export function renderDiscussion(
  discussion: DiscussionWrapper,
  options: DiscussionRenderOptions,
  headerLevel: number = 3, // Default to Level 3 for Issues
): RenderedDiscussion | undefined {
  // Render an IssueWrapper as a Markdown string
  let markdown = "";
  const sources = [discussion.url];

  if (options.header) {
    markdown += `${"#".repeat(headerLevel)} ${discussion.header}\n\n`;
  }

  if (
    (!options.updates || !discussion.comments.hasUpdate) &&
    (!options.body || !discussion._body)
  ) {
    if (options.skipIfEmpty || !options.header) {
      return undefined;
    } else {
      markdown +=
        "This Discussion has no updates, or body content to render.\n\n";
      return {
        markdown,
        sources,
      };
    }
  }

  if (options.createdAt) {
    markdown += `Discussion Opened: ${discussion.createdAt.toISOString()}`;
  }

  if (options.updatedAt) {
    markdown += `Discussion Edited: ${discussion.updatedAt.toISOString()}`;
  }

  if (options.body) {
    markdown += `${discussion._body}\n\n`;
  }

  if (options.updates) {
    const latestUpdates = discussion.comments.latestUpdates(options.updates);

    for (const update of latestUpdates) {
      const renderedUpdate = renderComment(update, options, headerLevel + 1);
      if (renderedUpdate) {
        markdown += `${renderedUpdate.markdown}\n\n`;
        sources.push(...renderedUpdate.sources);
      }
    }
  }

  return {
    markdown,
    sources,
  };
}
