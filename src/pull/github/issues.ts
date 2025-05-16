import { getOctokit } from "../../octokit";
import type { RestEndpointMethodTypes } from "@octokit/rest";

type ListIssuesParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];

export class IssueList {
  private response;
  private octokit = getOctokit();

  constructor(params: ListIssuesParameters) {
    this.response = this.octokit.issues.listForRepo(params);
  }

  async first(): Promise<string> {
    const response = await this.response;
    const issues = response.data;
    if (issues.length === 0) {
      return "";
    }
    const body = issues[0].body;
    if (!body) {
      return "";
    }
    return body;
  }
}
