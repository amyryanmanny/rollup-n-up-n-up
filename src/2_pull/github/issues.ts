import type { RestEndpointMethodTypes } from "@octokit/rest";

import { GitHubClient } from "./client";
import { getMemory } from "../../3_transform/memory";

import {
  listIssuesForProject,
  type ListIssuesForProjectParameters,
  type ProjectIssue,
  type ProjectIssueComment,
} from "./project";
import {
  getProjectView,
  ProjectView,
  type GetProjectViewParameters,
} from "./project-view";

// Interface
type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];

type SourceOfTruth = {
  title: string;
  url: string;
};

// Issue
type Issue = RestIssue | ProjectIssue;
type RestIssue =
  RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];

// Comment
type Comment = ProjectIssueComment;

const sortCommentsByDateDesc = (a: Comment, b: Comment) => {
  // Sort comments by createdAt in descending order
  return b.createdAt.getTime() - a.createdAt.getTime();
};
const filterUpdates = (comment: Comment) => {
  const updateMarker = RegExp(/<(!--\s*UPDATE\s*--)>/g); // TODO: Custom marker as input
  // Check if the comment body contains the update marker
  const isUpdate = updateMarker.test(comment.body);
  if (!isUpdate) return false;

  // SIDE_EFFECT: Remove the update marker from the body
  comment.body = comment.body.replaceAll(updateMarker, "");

  return true;
};

// Client Classes
class CommentWrapper {
  private comment: Comment;
  private issueTitle: string;
  private memory = getMemory();

  constructor(issueTitle: string, comment: Comment) {
    this.issueTitle = issueTitle;
    this.comment = comment;
  }

  static empty(): CommentWrapper {
    return new CommentWrapper("", {
      author: "",
      body: "No updates found",
      createdAt: new Date(0),
    });
  }

  // Properties
  author(): string {
    return this.comment.author;
  }

  createdAt(): Date {
    return this.comment.createdAt;
  }

  // Render / Memory Functions
  remember(bankIndex: number = 0) {
    this.memory.remember(
      `## Comment on ${this.issueTitle}:\n\n${this.comment.body}`,
      bankIndex,
    );
  }

  renderBody(memoryBankIndex: number = 0): string {
    this.remember(memoryBankIndex);
    return this.comment.body;
  }
}

class IssueWrapper {
  private issue: Issue;
  private memory = getMemory();

  constructor(issue: Issue) {
    this.issue = issue;
  }

  // Properties
  header(): string {
    return `[${this.issue.title}](${this.issue.url})`;
  }

  title(): string {
    return this.issue.title;
  }

  url(): string {
    return this.issue.url;
  }

  type(): string {
    return this.issue.type?.name || "Issue";
  }

  repo(): string | undefined {
    return this.issue.repository?.name;
  }

  repoNameWithOwner(): string | undefined {
    return this.issue.repository?.full_name;
  }

  projectFields(): Map<string, string> {
    // Return the custom fields of the issue
    if ("projectFields" in this.issue) {
      return this.issue.projectFields;
    }
    // For REST API issues, projectFields are not available
    return new Map<string, string>();
  }

  // Render / Memory Functions
  remember() {
    this.memory.remember(`## ${this.header()}:\n\n${this.issue.body}`);
  }

  renderBody(): string {
    this.remember();
    return this.issue.body || "";
  }

  // Comment Functions
  getComments(): Comment[] {
    const issue = this.issue;

    const comments = issue.comments;
    if (typeof comments == "number") {
      // For REST API issues, comments is a number
      // TODO: Fetch the comments for the issue
      throw new Error(
        "Fetching last update for REST API issues is not implemented yet.",
      );
    }

    return comments;
  }

  latestComment(): CommentWrapper {
    const comments = this.getComments().sort(sortCommentsByDateDesc);

    if (comments.length === 0) {
      return CommentWrapper.empty();
    }

    const latestComment = comments[0];
    return new CommentWrapper(this.issue.title, latestComment);
  }

  latestUpdate(): CommentWrapper {
    const comments = this.getComments().sort(sortCommentsByDateDesc);
    const updates = comments.filter(filterUpdates);

    if (updates.length === 0) {
      return CommentWrapper.empty();
    }

    const latestUpdate = updates[0];
    return new CommentWrapper(this.issue.title, latestUpdate);
  }
}

export class IssueList {
  private sourceOfTruth: SourceOfTruth;
  private issues: IssueWrapper[];

  private constructor(issues: Issue[], sourceOfTruth: SourceOfTruth) {
    this.sourceOfTruth = sourceOfTruth;
    this.issues = issues.map((issue) => new IssueWrapper(issue));
  }

  [Symbol.iterator]() {
    return this.issues[Symbol.iterator]();
  }

  applyFilter(view: ProjectView) {
    // Filter the issues
    this.issues = this.issues.filter((wrapper) => {
      if (!view.checkType(wrapper.type())) {
        return false;
      }

      if (!view.checkRepo(wrapper.repoNameWithOwner())) {
        return false;
      }

      for (const field of view.getCustomFields()) {
        const value = wrapper.projectFields().get(field);
        if (!view.checkField(field, value)) {
          return false;
        }
      }

      return true;
    });

    // Scope the Source of Truth to the view
    const viewNumber = view.getNumber();
    if (viewNumber) {
      this.sourceOfTruth.url += `/views/${viewNumber}`;
    }
    this.sourceOfTruth.title += ` (${view.getName()})`;
  }

  header(): string {
    return `[${this.sourceOfTruth.title}](${this.sourceOfTruth.url})`;
  }

  title(): string {
    return this.sourceOfTruth.title;
  }

  url(): string {
    return this.sourceOfTruth.url;
  }

  static async forRepo(
    client: GitHubClient,
    params: ListIssuesForRepoParameters,
  ): Promise<IssueList> {
    const response = await client.octokit.rest.issues.listForRepo(params);
    const issues = response.data;

    const url = `https://github.com/${params.owner}/${params.repo}`;
    const title = `Issues from ${params.owner}/${params.repo}`;

    return new IssueList(issues, { title, url });
  }

  static async forProject(
    client: GitHubClient,
    params: ListIssuesForProjectParameters,
  ): Promise<IssueList> {
    const response = await listIssuesForProject(client, params);

    const { issues, title, url } = response;

    return new IssueList(issues, { title, url });
  }

  static async forProjectView(
    client: GitHubClient,
    params: GetProjectViewParameters,
  ): Promise<IssueList> {
    let view: ProjectView;

    if (params.projectViewNumber === undefined) {
      if (params.customQuery === undefined) {
        throw new Error(
          "Either projectViewNumber or customQuery must be provided.",
        );
      }
      view = new ProjectView({
        name: "Custom Query",
        filter: params.customQuery,
      });
    } else {
      view = await getProjectView(client, params);
    }

    const issueList = await this.forProject(client, {
      organization: params.organization,
      projectNumber: params.projectNumber,
      typeFilter: view.getFilterType(),
    });
    issueList.applyFilter(view);

    return issueList;
  }
}
