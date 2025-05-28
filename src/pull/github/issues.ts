import { Client } from "./client";
import type { RestEndpointMethodTypes } from "@octokit/rest";

type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];
type Issue =
  RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];

export class IssueList {
  private issues: Promise<Issue[]>;

  private constructor(issues: Promise<Issue[]>) {
    this.issues = issues;
  }

  static forRepo(
    client: Client,
    params: ListIssuesForRepoParameters,
  ): IssueList {
    const response = client.octokit.rest.issues.listForRepo(params);
    const data = response.then((res) => res.data);
    return new IssueList(data);
  }

  async first(): Promise<string> {
    const issues = await this.issues;
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
