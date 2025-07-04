import path from "path";

import { getOctokit } from "@util/octokit";
import {
  getIssueByTitle,
  createIssue,
  updateIssue,
  type IssueCreateResponse,
  type IssueUpdateResponse,
} from "./issue";
import {
  createDiscussion,
  getDiscussionByTitle,
  getDiscussionCategoryId,
  updateDiscussion,
  type Discussion,
} from "./discussion";
import { createOrUpdateRepoFile } from "./repo-file";
import { addLinkToSummary } from "@util/log";

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

  async pushAll(
    targets: PushTarget[],
    title: string | undefined,
    body: string,
  ) {
    // Push all the items in the targets array
    const results = await Promise.all(
      targets.map((t) => this.push(t.type, t.url, title, body)),
    );

    return results;
  }

  async push(
    type: PushType,
    url: string,
    title: string | undefined,
    body: string,
  ) {
    switch (type) {
      case "repo-file":
        if (!title) {
          throw new Error("Title is required for 'repo-file' target.");
        }
        return this.pushToRepoFile(url, title, body);
      case "issue":
        if (!title) {
          throw new Error("Title is required for 'issue' target.");
        }
        return this.pushToIssue(url, title, body);
      case "issue-comment":
        return this.pushToIssueComment(url, body);
      case "discussion":
        if (!title) {
          throw new Error("Title is required for 'discussion' target.");
        }
        return this.pushToDiscussion(url, title, body);
      default:
        throw new Error(`Unsupported target: ${type}`);
    }
  }

  async pushToRepoFile(url: string, filename: string, body: string) {
    // Handle repo path, including /tree subpath
    const match = url.match(
      /https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/,
    );
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    const [, owner, repo, branch, directory] = match;

    const content = Buffer.from(body).toString("base64");
    const filePath = path.join(directory, filename);

    const data = await createOrUpdateRepoFile(this, {
      owner,
      repo,
      branch: branch !== "-" ? branch : undefined, // If branch is '-', use undefined to choose default
      path: filePath,
      message: `rollup-n-up-n-up generated: ${filename}`,
      content,
    });

    if (!data.content || !data.content.html_url) {
      throw new Error(
        `Failed to create or update file: ${filePath} in ${owner}/${repo}`,
      );
    }
    const repoFileUrl = data.content.html_url;

    addLinkToSummary("Repo File Created / Updated", repoFileUrl);
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
    let issue: IssueCreateResponse | IssueUpdateResponse;
    const existingIssue = await getIssueByTitle(this, owner, repo, title);
    if (existingIssue) {
      // If the issue exists, update it
      issue = await updateIssue(this, {
        owner,
        repo,
        issue_number: existingIssue.number,
        body, // Update the body of the existing issue
      });
    } else {
      // If the issue does not exist, create a new one
      issue = await createIssue(this, {
        owner,
        repo,
        title,
        body,
      });
    }

    addLinkToSummary("Issue Created / Updated", issue.html_url);
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
    const comment = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });

    addLinkToSummary("Issue Comment Created", comment.data.html_url);
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

    let discussion: Discussion;
    const existingDiscussion = await getDiscussionByTitle(
      this,
      owner,
      repo,
      title,
    );
    if (existingDiscussion) {
      // If the discussion already exists, update the body
      discussion = await updateDiscussion(this, existingDiscussion.id, body);
    } else {
      const categoryId = await getDiscussionCategoryId(
        this,
        owner,
        repo,
        categoryName,
      );
      discussion = await createDiscussion(
        this,
        owner,
        repo,
        categoryId,
        title,
        body,
      );
    }

    addLinkToSummary("Discussion Post Created / Updated", discussion.url);
  }
}
