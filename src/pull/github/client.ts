import { getMemory } from "../../ai/memory";
import { quickSummarize } from "../../ai/summarize";
import { getOctokit } from "../../octokit";
import { IssueList } from "./issues";

export class Client {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  issuesForRepo(owner: string, repo: string): IssueList {
    return IssueList.forRepo(this, { owner, repo });
  }

  issuesForProject(
    organization: string,
    projectNumber: number,
    typeFilter?: string,
    typeField?: string,
  ): IssueList {
    return IssueList.forProject(this, {
      organization,
      projectNumber,
      typeFilter,
      typeField,
    });
  }

  async summarizeMemory(): Promise<string> {
    const memory = getMemory();
    const summary = await quickSummarize(memory.getAll().join("\n\n"));
    return summary;
  }
}
