import { matchIssueUrl, matchProjectViewUrl } from "@util/github-url";
import { IssueWrapper } from "./issue";
import { IssueList } from "./issue-list";

import { getOctokit } from "@util/octokit";

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  url(url: string): Promise<IssueList | IssueWrapper> {
    // Single Issue
    const issueMatch = matchIssueUrl(url);
    if (issueMatch) {
      const { owner, repo, issueNumber } = issueMatch;

      if (issueNumber) {
        // If issueNumber is defined, return the specific issue
        return this.issue(owner, repo, issueNumber);
      } else {
        // Else return all issues for the repo
        return this.issuesForRepo(owner, repo);
      }
    }

    // Projects
    const projectMatch = matchProjectViewUrl(url);
    if (projectMatch) {
      const { organization, projectNumber, projectViewNumber, customQuery } =
        projectMatch;

      // Custom Query - Discard the View if it exists
      if (customQuery) {
        return this.issuesForProjectQuery(
          organization,
          projectNumber,
          customQuery,
        );
      }

      // Project View
      if (projectViewNumber) {
        return this.issuesForProjectView(
          organization,
          projectNumber,
          projectViewNumber,
        );
      }

      // Default to all Project Issues
      return this.issuesForProject(organization, projectNumber);
    }

    throw new Error(
      `Unsupported URL: ${url}. Please provide a valid GitHub issues URL.`,
    );
  }

  issue(
    owner: string,
    repo: string,
    issueNumber: string | number,
  ): Promise<IssueWrapper> {
    return IssueWrapper.forIssue({
      organization: owner,
      repo,
      issueNumber: parseInt(issueNumber as string),
    });
  }

  issuesForRepo(owner: string, repo: string): Promise<IssueList> {
    return IssueList.forRepo({ owner, repo });
  }

  subissuesForIssue(
    owner: string,
    repo: string,
    issueNumber: string,
  ): Promise<IssueList> {
    return IssueList.forSubissues({
      owner,
      repo,
      issueNumber: parseInt(issueNumber as string),
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
