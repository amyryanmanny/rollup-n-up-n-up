import { IssueList } from "./issues";

import { getOctokit } from "../../octokit";

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  issuesForRepo(owner: string, repo: string): Promise<IssueList> {
    return IssueList.forRepo(this, { owner, repo });
  }

  issuesForProject(
    organization: string,
    projectNumber: number,
    typeFilter?: string,
  ): Promise<IssueList> {
    return IssueList.forProject(this, {
      organization,
      projectNumber,
      typeFilter,
    });
  }
}
