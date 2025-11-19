import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import { pageInfoFragment } from "./fragments/page-info";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";

type IssueStateParam = "OPEN" | "CLOSED" | "ALL";
type IssueState = Omit<IssueStateParam, "ALL">; // Doesn't work due to GraphQL weirdness

export type ListIssuesForRepoParameters = {
  organization: string;
  repository: string;
  state?: IssueState;
};

type ListIssuesForRepoResponse = {
  issues: Issue[];
  title: string;
  url: string;
};

const pageSize = 50;

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
    query paginate($organization: String!, $repository: String!, $states: [IssueState!], $cursor: String) {
      repositoryOwner(login: $organization) {
        repository(name: $repository) {
          issues(first: ${pageSize}, states: $states, after: $cursor) {
            nodes {
              ${issueNodeFragment}
            }
            ${pageInfoFragment}
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const startTime = new Date();
  const response = await octokit.graphql.paginate<
    {
      repositoryOwner: {
        repository: {
          issues: {
            nodes: Array<IssueNode>;
            pageInfo: PageInfoForward;
          };
        };
      };
    } & RateLimit
  >(query, {
    organization: params.organization,
    repository: params.repository,
    states,
    headers: {
      "GraphQL-Features": "issue_fields",
    },
  });

  debugGraphQL("List Issues for Repo", params, response, startTime);

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
    title: `Issues for ${params.organization}/${params.repository}`,
    url: `https://github.com/${params.organization}/${params.repository}`,
  };
}
