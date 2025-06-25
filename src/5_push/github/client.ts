import { getOctokit } from "@util/octokit";
import { getIssueByTitle, createIssue, updateIssue } from "./issue";
import {
  createDiscussion,
  getDiscussionByTitle,
  getDiscussionCategoryId,
  updateDiscussion,
} from "./discussion";

export type PushTarget = {
  type: PushType;
  url: string;
};

export type PushType =
  | "repo-file"
  | "issue"
  | "issue-comment"
  | "discussion"
  | "discussion-comment";

export class GitHubPushClient {
  // The Client class is a wrapper around the GitHub API client.
  public octokit = getOctokit();

  async push(
    type: PushType,
    url: string,
    title: string | undefined,
    body: string,
  ) {
    switch (type) {
      case "issue":
        if (!title) {
          throw new Error("Title is required for issue push type.");
        }
        return this.pushToIssue(url, title, body);
      case "issue-comment":
        return this.pushToIssueComment(url, body);
      case "discussion":
        if (!title) {
          throw new Error("Title is required for discussion push type.");
        }
        return this.pushToDiscussion(url, title, body);
      default:
        throw new Error(`Unsupported push type: ${type}`);
    }
  }

  async pushAll(
    configs: PushTarget[],
    title: string | undefined,
    body: string,
  ) {
    // Push all the items in the configs array
    const results = await Promise.all(
      configs.map((config) => this.push(config.type, config.url, title, body)),
    );

    return results;
  }

  async pushToIssue(url: string, title: string, body: string) {
    // Handle repo path, including /issues subpath
    const match = url.match(
      /https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/issues\/\d+)?/,
    );
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    const [, owner, repo] = match;

    if (!owner || !repo) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    // Check if the issue already exists
    const issue = await getIssueByTitle(this, owner, repo, title);
    if (issue !== undefined) {
      // If the issue exists, update it
      return updateIssue(this, {
        owner,
        repo,
        issue_number: issue.number,
        body, // Update the body of the existing issue
      });
    }

    // If the issue does not exist, create a new one
    return createIssue(this, {
      owner,
      repo,
      title,
      body,
    });
  }

  async pushToIssueComment(url: string, body: string) {
    // Handle repo path, including /issues subpath
    const match = url.match(
      /https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/,
    );
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    const [, owner, repo, issueNumber] = match;
    const issue_number = parseInt(issueNumber, 10);
    if (isNaN(issue_number)) {
      throw new Error(`Invalid issue number in URL: ${url}`);
    }

    if (!owner || !repo || !issue_number) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    // Add a comment to the existing issue
    return this.octokit.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
  }

  async pushToDiscussion(url: string, title: string, body: string) {
    // Handle repo path, including /discussions subpath
    const match = url.match(
      /https:\/\/github\.com\/([^/]+)\/([^/]+)\/discussions(?:\/categories\/([^/]+))?/,
    );
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    const [, owner, repo, categoryName] = match;

    if (!owner || !repo) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    if (!categoryName) {
      throw new Error(
        `Category name is required. Ex: .../discussions/categories/reporting-dogfooding`,
      );
    }

    const existingDiscussion = await getDiscussionByTitle(
      this,
      owner,
      repo,
      title,
    );
    if (existingDiscussion) {
      // If the discussion already exists, update the body
      return updateDiscussion(this, existingDiscussion.id, body);
    }

    const categoryId = await getDiscussionCategoryId(
      this,
      owner,
      repo,
      categoryName,
    );
    return await createDiscussion(this, owner, repo, categoryId, title, body);
  }
}
