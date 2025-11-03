import {
  validateFetchParameters,
  type DirtyIssueFetchParameters,
} from "@config";

import { getOctokit } from "@util/octokit";
import {
  matchDiscussionCategoryUrl,
  matchDiscussionUrl,
  matchIssueUrl,
  matchProjectViewUrl,
} from "@util/github-url";

import { IssueWrapper } from "./issue";
import { IssueList } from "./issue-list";
import { DiscussionWrapper } from "./discussion";

// TODO: Positional and kwarg-based params
// kwargs need fuzzy matching
// e.g. issue_number -> `issueNumber`
//       org, owner -> `organization`
//       repo -> `repository`

export class GitHubClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  async url(
    url: string,
    issueFetchParams?: DirtyIssueFetchParameters, // TODO: Generalize
  ): Promise<IssueList | IssueWrapper | DiscussionWrapper> {
    // Single Issue
    const issueMatch = matchIssueUrl(url);
    if (issueMatch) {
      const { owner, repo, issueNumber } = issueMatch;

      if (issueNumber) {
        // If issueNumber is defined, return the specific issue
        return await this.issue(owner, repo, issueNumber, issueFetchParams);
      } else {
        // Else return all issues for the repo
        return await this.issuesForRepo(owner, repo, issueFetchParams);
      }
    }

    // Projects
    const projectMatch = matchProjectViewUrl(url);
    if (projectMatch) {
      const { organization, projectNumber, projectViewNumber, customQuery } =
        projectMatch;

      // Custom Query - Discard the View if it exists
      if (customQuery) {
        return await this.issuesForProjectQuery(
          organization,
          projectNumber,
          customQuery,
          issueFetchParams,
        );
      }

      // Project View
      if (projectViewNumber) {
        return await this.issuesForProjectView(
          organization,
          projectNumber,
          projectViewNumber,
          issueFetchParams,
        );
      }

      // Default to all Project Issues
      return await this.issuesForProject(
        organization,
        projectNumber,
        issueFetchParams,
      );
    }

    // Discussion
    const discussionMatch = matchDiscussionUrl(url);
    if (discussionMatch) {
      const { owner, repo, discussionNumber } = discussionMatch;

      if (discussionNumber) {
        return await this.discussion(owner, repo, discussionNumber);
      } else {
        // return this.discussionsForRepo(owner, repo);
      }
    }

    // Discussion Category - Latest Discussion
    const discussionCategoryMatch = matchDiscussionCategoryUrl(url);
    if (discussionCategoryMatch) {
      const { owner, repo, categoryName } = discussionCategoryMatch;

      if (categoryName) {
        return await this.latestDiscussionInCategory(owner, repo, categoryName);
      }
    }

    throw new Error(
      `Unsupported URL: ${url}. Please provide a valid GitHub issues URL.`,
    );
  }

  // Issues
  async issue(
    organization: string,
    repository: string,
    issueNumber: string | number,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueWrapper> {
    return await IssueWrapper.forIssue(
      {
        organization,
        repository,
        issueNumber: Number(issueNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  async issuesForRepo(
    organization: string,
    repository: string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return await IssueList.forRepo(
      {
        organization,
        repository,
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  async subissuesForIssue(
    organization: string,
    repository: string,
    issueNumber: string | number,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return await IssueList.forSubissues(
      {
        organization,
        repository,
        issueNumber: Number(issueNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  async issuesForProject(
    organization: string,
    projectNumber: string | number,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return await IssueList.forProject(
      {
        organization,
        projectNumber: Number(projectNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  async issuesForProjectView(
    organization: string,
    projectNumber: number | string,
    projectViewNumber: number | string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return await IssueList.forProjectView(
      {
        organization,
        projectNumber: Number(projectNumber),
        projectViewNumber: Number(projectViewNumber),
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  async issuesForProjectQuery(
    organization: string,
    projectNumber: number | string,
    customQuery: string,
    issueFetchParams?: DirtyIssueFetchParameters,
  ): Promise<IssueList> {
    return await IssueList.forProjectView(
      {
        organization,
        projectNumber: Number(projectNumber),
        customQuery,
      },
      validateFetchParameters(issueFetchParams),
    );
  }

  // Discussions
  async discussion(
    organization: string,
    repository: string,
    discussionNumber: string | number,
  ): Promise<DiscussionWrapper> {
    return await DiscussionWrapper.forDiscussion({
      organization,
      repository,
      discussionNumber: Number(discussionNumber),
    });
  }

  async latestDiscussionInCategory(
    organization: string,
    repository: string,
    categoryName: string,
  ): Promise<DiscussionWrapper> {
    return await DiscussionWrapper.forLatestInCategory({
      organization,
      repository,
      categoryName,
    });
  }
}
