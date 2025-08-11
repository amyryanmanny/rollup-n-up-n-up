import { getOctokit } from "@util/octokit";
import type { Issue } from "../issue";
import {
  ISSUE_PAGE_SIZE,
  NUM_ISSUE_ASSIGNESS,
  NUM_ISSUE_COMMENTS,
  NUM_ISSUE_LABELS,
} from ".";

type IssueStateParam = "OPEN" | "CLOSED" | "ALL";
type IssueState = Omit<IssueStateParam, "ALL">; // Doesn't work due to GraphQL weirdness

export type ListIssuesForRepoParameters = {
  owner: string;
  repo: string;
  state?: IssueState;
};

type ListIssuesForRepoResponse = {
  issues: Issue[];
  title: string;
  url: string;
};

export async function listIssuesForRepo(
  params: ListIssuesForRepoParameters,
): Promise<ListIssuesForRepoResponse> {
  const octokit = getOctokit();

  // Compute state
  const state = params.state?.trim().toUpperCase() || "OPEN";
  let states: Array<IssueState>;
  switch (state) {
    case "OPEN":
    case "CLOSED":
      states = [state];
      break;
    case "ALL":
      states = ["OPEN", "CLOSED"];
      break;
    default:
      throw new Error(
        `Unknown IssueState: ${state}. Choose OPEN, CLOSED, or ALL.`,
      );
  }

  const query = `
    query paginate($owner: String!, $repo: String!, $states: [IssueState!], $cursor: String) {
      repositoryOwner(login: $owner) {
        repository(name: $repo) {
          issues(first: ${ISSUE_PAGE_SIZE}, states: $states, after: $cursor) {
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
                  updatedAt
                  url
                }
              }
              parent {
                title
                url
                number
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    }
  `;

  const response = await octokit.graphql.paginate<{
    repositoryOwner: {
      repository: {
        issues: {
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
                updatedAt: string; // ISO 8601 date string
                url: string;
              }>;
            };
            parent: {
              title: string;
              url: string;
              number: number;
            } | null;
          }>;
          pageInfo: {
            endCursor: string;
            hasNextPage: boolean;
          };
        };
      };
    };
  }>(query, {
    owner: params.owner,
    repo: params.repo,
    states: states,
  });

  const issues = response.repositoryOwner.repository.issues.nodes.map(
    (issue): Issue => ({
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
        updatedAt: new Date(comment.updatedAt),
        url: comment.url,
      })),
      parent: issue.parent
        ? {
            title: issue.parent.title,
            url: issue.parent.url,
            number: issue.parent.number,
          }
        : undefined,
      isSubissue: false,
    }),
  );

  return {
    issues,
    // TODO: Move this logic out to IssueList
    title: `Issues for ${params.owner}/${params.repo}`,
    url: `https://github.com/${params.owner}/${params.repo}`,
  };
}
