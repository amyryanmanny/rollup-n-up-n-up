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
    return IssueList.forProjectV2(this, {
      organization,
      projectNumber,
      typeFilter,
      typeField,
    });
  }
}
