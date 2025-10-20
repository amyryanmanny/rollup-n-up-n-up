import { getOctokit } from "@util/octokit";

import type { Comment } from "../comment";
import type { GetIssueParameters } from "./issue";

import {
  commentFragment,
  mapCommentNode,
  type CommentNode,
} from "./fragments/comment";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";
import { isOctokitRequestError } from "@util/error";

type ListCommentsForListOfIssuesParams = {
  issues: Array<GetIssueParameters>;
  numComments: number;
};

type ListCommentsForListOfIssuesResponse = Map<
  GetIssueParameters,
  Array<Comment>
>;

let batchSize = 25;

async function listCommentsForBatchOfIssues(
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

  const startTime = new Date();
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
  >(query, { request: { retries: 0 } });

  if (!response) {
    throw new Error("No response from GitHub, please try again.");
  }

  debugGraphQL(
    "List Comments for List of Issues",
    `Num Issues: ${params.issues.length}`,
    response,
    startTime,
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

export async function listCommentsForListOfIssues(
  params: ListCommentsForListOfIssuesParams,
): Promise<ListCommentsForListOfIssuesResponse> {
  const issues = new Map<GetIssueParameters, Array<Comment>>();

  let cursor = 0;

  try {
    while (cursor < params.issues.length) {
      const batch = params.issues.slice(cursor, cursor + batchSize);
      const batchIssues = await listCommentsForBatchOfIssues({
        issues: batch,
        numComments: params.numComments,
      });
      batchIssues.forEach((comments, issue) => {
        issues.set(issue, comments);
      });
      cursor += batchSize;
    }
  } catch (error) {
    if (isOctokitRequestError(error)) {
      if (error.status === 429) {
        batchSize = Math.floor(batchSize / 2);
        if (batchSize < 1) {
          throw new Error("Cannot reduce Comments batchSize further");
        }
        console.warn(
          `Comments request timed out, reducing batchSize to ${batchSize} and retrying...`,
        );
        return listCommentsForListOfIssues(params);
      }
    }
    throw error;
  }

  return issues;
}
