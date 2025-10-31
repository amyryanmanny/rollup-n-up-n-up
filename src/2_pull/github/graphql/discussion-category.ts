import { getOctokit } from "@util/octokit";

import type { Discussion } from "../discussion";

import {
  discussionNodeFragment,
  mapDiscussionNode,
  type DiscussionNode,
} from "./fragments/discussion";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";

export async function getDiscussionCategoryId(
  params: GetDiscussionCategoryParameters,
): Promise<string> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repository: String!, $categoryName: String!) {
      repository(owner: $organization, name: $repository) {
        discussionCategory(slug: $categoryName) {
          id
        }
      }
    }
  `;

  const response = await octokit.graphql<{
    repository: {
      discussionCategory: {
        id: string;
      };
    };
  }>(query, params);

  const categoryId = response.repository.discussionCategory.id;
  if (!categoryId) {
    throw new Error(
      `Discussion category "${params.categoryName}" not found in repository ${params.organization}/${params.repository}`,
    );
  }
  return categoryId;
}

export type GetDiscussionCategoryParameters = {
  organization: string;
  repository: string;
  categoryName: string;
};

// TODO: Merge with similar function in src/5_push/github/discussion.ts
export async function getLatestDiscussionInCategory(
  params: GetDiscussionCategoryParameters,
): Promise<Discussion> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repository: String!, $discussionCategoryId: ID!) {
      organization(login: $organization) {
        repository(name: $repository) {
          discussions(
            categoryId: $discussionCategoryId,
            first: 1,
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            nodes {
              ${discussionNodeFragment}
            }
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
          discussions: {
            nodes: Array<DiscussionNode>;
          };
        };
      };
    } & RateLimit
  >(query, {
    ...params,
    discussionCategoryId: await getDiscussionCategoryId(params),
  });

  debugGraphQL("Get Latest Discussion", params, response, startTime);

  const discussion =
    response.organization.repository.discussions.nodes.map(
      mapDiscussionNode,
    )[0];

  if (!discussion) {
    throw new Error(
      `No Discussions found in Category "${params.categoryName}" of ${params.organization}/${params.repository}`,
    );
  }

  return discussion;
}
