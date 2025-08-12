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
  let markdown = `${"#".repeat(headerLevel)} ${issueList.header}\n\n`;
  const sources = [issueList.url];

  if (issueList.isEmpty) {
    if (options.skipIfEmpty) {
      return undefined;
    }
    markdown += "No issues found.\n\n";
    return { markdown, sources };
  }

  for (const issue of issueList) {
    const renderedIssue = renderIssue(issue, options, headerLevel + 1);
    if (renderedIssue) {
      markdown += `${renderedIssue.markdown}\n\n`;
      sources.push(...renderedIssue.sources);
    }
  }

  markdown += `---\n\n`; // End IssueLists with a horizontal rule

  return {
    markdown,
    sources,
  };
}
