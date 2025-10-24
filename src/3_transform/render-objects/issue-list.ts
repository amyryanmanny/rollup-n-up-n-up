import type { IssueList } from "@pull/github/issue-list";
import { renderIssue, type IssueRenderOptions } from "./issue";

export type RenderedIssueList = {
  markdown: string;
  sources: string[];
};

export function renderIssueList(
  issueList: IssueList,
  options: IssueRenderOptions,
  headerLevel: number = 2, // Default to Level 2 for IssueLists
): RenderedIssueList | undefined {
  // Render an IssueList as a Markdown string
  let markdown = "";
  const sources = [issueList.url];

  if (options.header) {
    markdown += `${"#".repeat(headerLevel)} ${issueList.header}\n\n`;
  }

  if (issueList.isEmpty) {
    if (options.skipIfEmpty || !options.header) {
      return undefined;
    }
    markdown += "No Issues found.\n\n";
    return { markdown, sources };
  }

  let someIssueWasRendered = false;
  for (const issue of issueList) {
    const renderedIssue = renderIssue(issue, options, headerLevel + 1);
    if (renderedIssue) {
      markdown += `${renderedIssue.markdown}\n\n`;
      sources.push(...renderedIssue.sources);
      someIssueWasRendered = true;
    }
  }

  if (options.skipIfEmpty && !someIssueWasRendered) {
    return undefined;
  }

  markdown += `---\n\n`; // End IssueLists with a horizontal rule

  return {
    markdown,
    sources,
  };
}
