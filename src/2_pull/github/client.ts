import { IssueWrapper } from "./issue";
import { IssueList } from "./issue-list";

import { getOctokit } from "@util/octokit";
import { matchIssueUrl, matchProjectViewUrl } from "@util/github-url";

import {
  validateFetchParameters,
  type DirtyIssueFetchParameters,
} from "@config";

// TODO: Positional and kwarg-based params
// kwargs need fuzzy matching
// e.g. issue_number -> `issueNumber`
//       org, owner -> `organization`
//       repo -> `repository`

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  url(
    url: string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList | IssueWrapper> {
    // Single Issue
    const issueMatch = matchIssueUrl(url);
    if (issueMatch) {
      const { owner, repo, issueNumber } = issueMatch;

      if (issueNumber) {
        // If issueNumber is defined, return the specific issue
        return this.issue(owner, repo, issueNumber, issueFetchParams);
      } else {
        // Else return all issues for the repo
        return this.issuesForRepo(owner, repo, issueFetchParams);
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
          issueFetchParams,
        );
      }

      // Project View
      if (projectViewNumber) {
        return this.issuesForProjectView(
          organization,
          projectNumber,
          projectViewNumber,
          issueFetchParams,
        );
      }

      // Default to all Project Issues
      return this.issuesForProject(
        organization,
        projectNumber,
        issueFetchParams,
      );
    }

    throw new Error(
      `Unsupported URL: ${url}. Please provide a valid GitHub issues URL.`,
    );
  }

  issue(
    organization: string,
    repository: string,
    issueNumber: string | number,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueWrapper> {
    return IssueWrapper.forIssue(
      {
        organization,
        repository,
        issueNumber: Number(issueNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  issuesForRepo(
    organization: string,
    repository: string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return IssueList.forRepo(
      {
        organization,
        repository,
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  subissuesForIssue(
    organization: string,
    repository: string,
    issueNumber: string | number,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return IssueList.forSubissues(
      {
        organization,
        repository,
        issueNumber: Number(issueNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  issuesForProject(
    organization: string,
    projectNumber: string | number,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return IssueList.forProject(
      {
        organization,
        projectNumber: Number(projectNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  issuesForProjectView(
    organization: string,
    projectNumber: number | string,
    projectViewNumber: number | string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return IssueList.forProjectView(
      {
        organization,
        projectNumber: Number(projectNumber),
        projectViewNumber: Number(projectViewNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  issuesForProjectQuery(
    organization: string,
    projectNumber: number | string,
    customQuery: string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return IssueList.forProjectView(
      {
        organization,
        projectNumber: Number(projectNumber),
        customQuery,
      },
      validateFetchParameters(issueFetchParams),
    );
  }
}
