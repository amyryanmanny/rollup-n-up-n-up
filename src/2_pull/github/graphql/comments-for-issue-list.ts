import { getOctokit } from "@util/octokit";

import type { Comment } from "../comment";
import type { GetIssueParameters } from "./issue";

import {
  commentFragment,
  mapCommentNode,
  type CommentNode,
} from "./fragments/comment";
import {
  debugGraphQLRateLimit,
  rateLimitFragment,
  type RateLimit,
} from "./fragments/rate-limit";

type ListCommentsForListOfIssuesParams = {
  issues: Array<GetIssueParameters>;
  numComments: number;
};

type ListCommentsForListOfIssuesResponse = Map<
  GetIssueParameters,
  Array<Comment>
>;

export async function listCommentsForListOfIssues(
  params: ListCommentsForListOfIssuesParams,
): Promise<ListCommentsForListOfIssuesResponse> {
  if (!params.issues.length) {
    return new Map();
  }

  const octokit = getOctokit();

  const query = `
    query {
      ${params.issues
        .map(
          ({ organization, repository, issueNumber }, index) => `issue${
            index + 1
          }: repository(owner: "${organization}", name: "${repository}") {
              issue(number: ${issueNumber}) {
                comments(last: ${params.numComments}) {
                  nodes {
                    ${commentFragment}
                  }
                }
              }
            }
          `,
        )
        .join("\n")}
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql<
    {
      [issue: string]: {
        issue: {
          comments: {
            nodes: Array<CommentNode>;
          };
        };
      };
    } & RateLimit
  >(query);

  debugGraphQLRateLimit(
    "List Comments for List of Issues",
    `Num Issues: ${params.issues.length}`,
    response,
  );

  const issues = new Map<GetIssueParameters, Array<Comment>>();
  for (let i = 0; i < params.issues.length; i++) {
    const issueResponse = response[`issue${i + 1}`];
    if (issueResponse === undefined) {
      continue;
    }

    const comments = issueResponse.issue.comments.nodes.map(mapCommentNode);
    issues.set(params.issues[i] as GetIssueParameters, comments);
  }

  return issues;
}
