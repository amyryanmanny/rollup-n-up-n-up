import { getOctokit } from "@util/octokit";
import type { Issue } from "../issue";
import { NUM_ISSUE_ASSIGNESS, NUM_ISSUE_COMMENTS, NUM_ISSUE_LABELS } from ".";

export type GetIssueParameters = {
  organization: string;
  repo: string;
  issueNumber: number;
};

export async function getIssue(params: GetIssueParameters): Promise<Issue> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repo: String!, $issueNumber: Int!) {
      organization(login: $organization) {
        repository(name: $repo) {
          issue(number: $issueNumber) {
            title
            body
            url
            number
            state
            createdAt
            updatedAt
            issueType {
              name
            }
            repository {
              name
              owner {
                login
              }
              nameWithOwner
            }
            assignees(first: ${NUM_ISSUE_ASSIGNESS}) {
              nodes {
                login
              }
            }
            labels(first: ${NUM_ISSUE_LABELS}) {
              nodes {
                name
              }
            }
            comments(last: ${NUM_ISSUE_COMMENTS}) {
              nodes {
                author {
                  login
                }
                body
                createdAt
                url
              }
            }
          }
        }
      }
    }
  `;

  const response = await octokit.graphql<{
    organization: {
      repository: {
        issue: {
          title: string;
          body: string;
          url: string;
          number: number;
          state: "OPEN" | "CLOSED";
          createdAt: string; // ISO 8601 date string
          updatedAt: string; // ISO 8601 date string
          issueType: {
            name: string;
          } | null;
          repository: {
            name: string;
            owner: {
              login: string;
            };
            nameWithOwner: string;
          };
          assignees: {
            nodes: Array<{ login: string }>;
          };
          labels: {
            nodes: Array<{ name: string }>;
          };
          comments: {
            nodes: Array<{
              author: {
                login: string;
              } | null;
              body: string;
              createdAt: string; // ISO 8601 date string
              url: string;
            }>;
          };
        };
      };
    };
  }>(query, params);

  const issue = response.organization.repository.issue;

  return {
    title: issue.title,
    body: issue.body,
    url: issue.url,
    number: issue.number,
    state: issue.state,
    createdAt: new Date(issue.createdAt),
    updatedAt: new Date(issue.updatedAt),
    type: issue.issueType?.name || "Issue",
    repository: {
      name: issue.repository.name,
      owner: issue.repository.owner.login,
      nameWithOwner: issue.repository.nameWithOwner,
    },
    assignees: issue.assignees.nodes.map((assignee) => assignee.login),
    labels: issue.labels.nodes.map((label) => label.name),
    comments: issue.comments.nodes.map((comment) => ({
      author: comment.author?.login || "Unknown",
      body: comment.body,
      createdAt: new Date(comment.createdAt),
      url: comment.url,
    })),
    isSubissue: false,
  };
}
