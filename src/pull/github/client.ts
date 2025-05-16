import { IssueList } from "./issues";

export class Client {
  getIssues(owner: string, repo: string): IssueList {
    return new IssueList({ owner, repo });
  }
}
