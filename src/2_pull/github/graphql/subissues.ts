import { getOctokit } from "@util/octokit";
import type { Issue } from "../issue";
import {
  ISSUE_PAGE_SIZE,
  NUM_ISSUE_ASSIGNESS,
  NUM_ISSUE_COMMENTS,
  NUM_ISSUE_LABELS,
} from ".";

export type ListSubissuesForIssueParameters = {
  owner: string;
  repo: string;
  issueNumber: number;
};

type ListSubissuesForIssueResponse = {
  subissues: Issue[];
  title: string;
  url: string;
};

export async function listSubissuesForIssue(
  params: ListSubissuesForIssueParameters,
): Promise<ListSubissuesForIssueResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($owner: String!, $repo: String!, $issueNumber: Int!, $cursor: String) {
      repositoryOwner(login: $owner) {
        repository(name: $repo) {
          issue(number: $issueNumber) {
            title
            url
            subIssues(first: ${ISSUE_PAGE_SIZE}, after: $cursor) {
              nodes {
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
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    }
  `;

  const response = await octokit.graphql.paginate<{
    repositoryOwner: {
      repository: {
        issue: {
          title: string;
          url: string;
          subIssues: {
            nodes: Array<{
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
                nodes: Array<{
                  login: string;
                }>;
              };
              labels: {
                nodes: Array<{
                  name: string;
                }>;
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
            }>;
          };
        };
      };
    };
  }>(query, params);

  const subissues =
    response.repositoryOwner.repository.issue.subIssues.nodes.map(
      // TODO: Refactor shared GraphQL logic. mapIssueNodes helper or something
      (subIssue): Issue => ({
        title: subIssue.title,
        body: subIssue.body,
        url: subIssue.url,
        number: subIssue.number,
        state: subIssue.state,
        createdAt: new Date(subIssue.createdAt),
        updatedAt: new Date(subIssue.updatedAt),
        type: subIssue.issueType?.name || "Issue",
        repository: {
          name: subIssue.repository.name,
          owner: subIssue.repository.owner.login,
          nameWithOwner: subIssue.repository.nameWithOwner,
        },
        assignees: subIssue.assignees.nodes.map((assignee) => assignee.login),
        labels: subIssue.labels.nodes.map((label) => label.name),
        comments: subIssue.comments.nodes.map((comment) => ({
          author: comment.author?.login || "Unknown",
          body: comment.body,
          createdAt: new Date(comment.createdAt),
          url: comment.url,
        })),
      }),
    );

  const issueTitle = response.repositoryOwner.repository.issue.title;
  return {
    subissues,
    title: `Subissues for ${issueTitle} (#${params.issueNumber})`,
    url: response.repositoryOwner.repository.issue.url,
  };
}
