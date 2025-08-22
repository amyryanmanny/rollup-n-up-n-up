import { getOctokit } from "@util/octokit";

import type { Comment } from "../comment";
import type { GetIssueParameters } from "./issue";

import {
  commentFragment,
  mapCommentNode,
  type CommentNode,
} from "./fragments/comment";
import { pageInfoFragment } from "./fragments/page-info";
import {
  debugGraphQLRateLimit,
  rateLimitFragment,
  type RateLimit,
} from "./fragments/rate-limit";

type ListCommentsForIssueParams = GetIssueParameters & {
  numComments: number;
};

export async function listCommentsForIssue(
  // Same Params to lookup the issues
  params: ListCommentsForIssueParams,
): Promise<Array<Comment>> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repository: String!, $issueNumber: Int!) {
      repositoryOwner(login: $organization) {
        repository(name: $repository) {
          issue(number: $issueNumber) {
            comments(last: ${params.numComments}) {
              nodes {
                ${commentFragment}
              }
              ${pageInfoFragment}
            }
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql.paginate<
    {
      repositoryOwner: {
        repository: {
          issue: {
            comments: {
              nodes: Array<CommentNode>;
            };
          };
        };
      };
    } & RateLimit
  >(query, {
    organization: params.organization,
    repository: params.repository,
    issueNumber: params.issueNumber,
  });

  debugGraphQLRateLimit("List Comments for Issue", params, response);

  return response.repositoryOwner.repository.issue.comments.nodes.map(
    mapCommentNode,
  );
}
