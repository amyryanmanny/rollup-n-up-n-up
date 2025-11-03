import { DiscussionList } from "@pull/github/discussion-list";
import { renderDiscussion, type DiscussionRenderOptions } from "./discussion";

export type RenderedDiscussionList = {
  markdown: string;
  sources: string[];
};

export function renderDiscussionList(
  discussionList: DiscussionList,
  options: DiscussionRenderOptions,
  headerLevel: number = 2, // Default to Level 2 for DiscussionLists
): RenderedDiscussionList | undefined {
  // Render a DiscussionList as a Markdown string
  let markdown = "";
  const sources = [discussionList.url];

  if (options.header) {
    markdown += `${"#".repeat(headerLevel)} ${discussionList.header}\n\n`;
  }

  if (discussionList.isEmpty) {
    if (options.skipIfEmpty || !options.header) {
      return undefined;
    }
    markdown += "No Discussions found.\n\n";
    return { markdown, sources };
  }

  let someDiscussionWasRendered = false;
  for (const discussion of discussionList) {
    const renderedDiscussion = renderDiscussion(
      discussion,
      options,
      headerLevel + 1,
    );
    if (renderedDiscussion) {
      markdown += `${renderedDiscussion.markdown}\n\n`;
      sources.push(...renderedDiscussion.sources);
      someDiscussionWasRendered = true;
    }
  }

  if (options.skipIfEmpty && !someDiscussionWasRendered) {
    return undefined;
  }

  markdown += `---\n\n`; // End DiscussionLists with a horizontal rule

  return {
    markdown,
    sources,
  };
}
