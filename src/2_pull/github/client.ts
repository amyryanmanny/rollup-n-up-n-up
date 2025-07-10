import { IssueList } from "./issue-list";

import { getOctokit } from "@util/octokit";

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  url(url: string): Promise<IssueList> {
    const urlParts = new URL(url);
    let match: RegExpMatchArray | null;

    if (urlParts.hostname !== "github.com") {
      // Troublemakers
      throw new Error(
        `Unsupported hostname: ${urlParts.hostname}. Please provide a valid GitHub URL.`,
      );
    }

    // Repo Issues
    match = urlParts.pathname.match(/\/([^/]+)\/([^/]+)\/issues/);
    if (match) {
      const owner = match[1];
      const repo = match[2];

      return this.issuesForRepo(owner, repo);
    }

    // Project View
    match = urlParts.pathname.match(
      /orgs\/([^/]+)\/projects\/(\d+)\/views\/(\d+)/,
    );
    if (match) {
      const organization = match[1];
      const projectNumber = parseInt(match[2], 10);
      const projectViewNumber = parseInt(match[3], 10);

      return this.issuesForProjectView(
        organization,
        projectNumber,
        projectViewNumber,
      );
    }

    // Project Query
    match = urlParts.pathname.match(/orgs\/([^/]+)\/projects\/(\d+)/);
    if (match) {
      const organization = match[1];
      const projectNumber = parseInt(match[2], 10);

      // Extract the query from the URL search parameters
      const customQuery = urlParts.searchParams.get("filterQuery") || "";

      return this.issuesForProjectQuery(
        organization,
        projectNumber,
        customQuery,
      );
    }

    throw new Error(
      `Unsupported URL: ${url}. Please provide a valid GitHub issues URL.`,
    );
  }

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
