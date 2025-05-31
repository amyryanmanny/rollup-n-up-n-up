import { summarize } from "../../ai/summarize";
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

  async renderSummary(prompt: string, memoryBank: number = 0): Promise<string> {
    return await summarize(prompt, memoryBank);
  }
}
