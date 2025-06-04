import { IssueList } from "./issues";
import { summarize } from "../../3_transform/ai/summarize";

import { getOctokit } from "../../octokit";
import { getMemory } from "../../3_transform/memory";

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

  reset(): void {
    const memory = getMemory();
    memory.headbonk(); // Clear all memory banks
  }

  async renderSummary(prompt: string, memoryBank: number = 0): Promise<string> {
    return await summarize(prompt, memoryBank);
  }
}
