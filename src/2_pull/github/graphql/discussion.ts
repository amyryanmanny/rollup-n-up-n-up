import { getOctokit } from "@util/octokit";

import type { Discussion } from "../discussion";

import {
  discussionNodeFragment,
  mapDiscussionNode,
  type DiscussionNode,
} from "./fragments/discussion";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";

export type GetDiscussionParameters = {
  organization: string;
  repository: string;
  discussionNumber: number;
};

export async function getDiscussion(
  params: GetDiscussionParameters,
): Promise<Discussion> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repository: String!, $discussionNumber: Int!) {
      organization(login: $organization) {
        repository(name: $repository) {
          discussion(number: $discussionNumber) {
            ${discussionNodeFragment}
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const startTime = new Date();
  const response = await octokit.graphql<
    {
      organization: {
        repository: {
          discussion: DiscussionNode;
        };
      };
    } & RateLimit
  >(query, params);

  debugGraphQL("Get Discussion", params, response, startTime);

  return mapDiscussionNode(response.organization.repository.discussion);
}
