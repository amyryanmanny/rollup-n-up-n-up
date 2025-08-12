import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  ISSUE_PAGE_SIZE,
  NUM_ISSUE_ASSIGNESS,
  NUM_ISSUE_COMMENTS,
  NUM_ISSUE_LABELS,
} from ".";

import { mapIssueNode, type IssueNode } from "./issue";

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
              __typename
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
          nodes: Array<IssueNode>;
          pageInfo: PageInfoForward;
        };
      };
    };
  }>(query, {
    owner: params.owner,
    repo: params.repo,
    states,
  });

  const issues = response.repositoryOwner.repository.issues.nodes.map(
    (issue) => {
      return {
        ...mapIssueNode(issue),
        isSubissue: false,
      };
    },
  );

  return {
    issues,
    // TODO: Move this logic out to IssueList
    title: `Issues for ${params.owner}/${params.repo}`,
    url: `https://github.com/${params.owner}/${params.repo}`,
  };
}
