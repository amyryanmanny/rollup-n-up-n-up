import { IssueList } from "./issue-list";

import { getOctokit } from "@util/octokit";

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  // TODO: Support URL. Just decompose the URL and call the other methods

  issuesForRepo(owner: string, repo: string): Promise<IssueList> {
    return IssueList.forRepo({ owner, repo });
  }

  subissuesForIssue(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<IssueList> {
    return IssueList.forSubissues({
      owner,
      repo,
      issueNumber,
    });
  }

  issuesForProject(
    organization: string,
    projectNumber: number,
    typeFilter?: string[] | string,
  ): Promise<IssueList> {
    if (typeof typeFilter === "string") {
      typeFilter = [typeFilter];
    }
    return IssueList.forProject({
      organization,
      projectNumber,
      typeFilter,
    });
  }

  issuesForProjectView(
    organization: string,
    projectNumber: number,
    projectViewNumber: number,
  ): Promise<IssueList> {
    return IssueList.forProjectView({
      organization,
      projectNumber,
      projectViewNumber,
    });
  }

  issuesForProjectQuery(
    organization: string,
    projectNumber: number,
    customQuery: string,
  ): Promise<IssueList> {
    return IssueList.forProjectView({
      organization,
      projectNumber,
      customQuery,
    });
  }
}
