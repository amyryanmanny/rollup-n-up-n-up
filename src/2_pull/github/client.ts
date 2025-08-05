import { matchIssueUrl, matchProjectViewUrl } from "@util/github-url";
import { IssueWrapper } from "./issue";
import { IssueList } from "./issue-list";

import { getOctokit } from "@util/octokit";

// TODO: Positional and kwarg-based params
// kwargs need fuzzy matching
// e.g. issue_number -> `issueNumber`
//       org, owner -> `organization`
//       repo -> `repository`

export type FetchParameters = {
  subissues?: boolean;
};

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  url(
    url: string,
    params?: FetchParameters,
  ): Promise<IssueList | IssueWrapper> {
    // Single Issue
    const issueMatch = matchIssueUrl(url);
    if (issueMatch) {
      const { owner, repo, issueNumber } = issueMatch;

      if (issueNumber) {
        // If issueNumber is defined, return the specific issue
        return this.issue(owner, repo, issueNumber, params);
      } else {
        // Else return all issues for the repo
        return this.issuesForRepo(owner, repo, params);
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
          params,
        );
      }

      // Project View
      if (projectViewNumber) {
        return this.issuesForProjectView(
          organization,
          projectNumber,
          projectViewNumber,
          params,
        );
      }

      // Default to all Project Issues
      return this.issuesForProject(organization, projectNumber, params);
    }

    throw new Error(
      `Unsupported URL: ${url}. Please provide a valid GitHub issues URL.`,
    );
  }

  issue(
    owner: string,
    repo: string,
    issueNumber: string | number,
    params?: FetchParameters,
  ): Promise<IssueWrapper> {
    return IssueWrapper.forIssue({
      ...params,
      organization: owner,
      repo,
      issueNumber: parseInt(issueNumber as unknown as string),
    });
  }

  issuesForRepo(
    owner: string,
    repo: string,
    params?: FetchParameters,
  ): Promise<IssueList> {
    return IssueList.forRepo({ ...params, owner, repo });
  }

  subissuesForIssue(
    owner: string,
    repo: string,
    issueNumber: string,
    params?: FetchParameters,
  ): Promise<IssueList> {
    return IssueList.forSubissues({
      ...params,
      owner,
      repo,
      issueNumber: parseInt(issueNumber as unknown as string),
    });
  }

  issuesForProject(
    organization: string,
    projectNumber: number,
    params?: FetchParameters,
  ): Promise<IssueList> {
    return IssueList.forProject({
      ...params,
      organization,
      projectNumber,
    });
  }

  issuesForProjectView(
    organization: string,
    projectNumber: number,
    projectViewNumber: number,
    params?: FetchParameters,
  ): Promise<IssueList> {
    return IssueList.forProjectView({
      ...params,
      organization,
      projectNumber,
      projectViewNumber,
    });
  }

  issuesForProjectQuery(
    organization: string,
    projectNumber: number,
    customQuery: string,
    params?: FetchParameters,
  ): Promise<IssueList> {
    return IssueList.forProjectView({
      ...params,
      organization,
      projectNumber,
      customQuery,
    });
  }
}
