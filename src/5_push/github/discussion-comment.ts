import type { GitHubPushClient } from "./client";

export type DiscussionComment = {
  id: string;
  body: string;
  url: string;
};

export async function createDiscussionComment(
  client: GitHubPushClient,
  discussionId: string,
  body: string,
): Promise<DiscussionComment> {
  const mutation = `
    mutation ($discussionId: ID!, $body: String!) {
      addDiscussionComment(input: {
        discussionId: $discussionId,
        body: $body
      }) {
        comment {
          id
          body
          url
        }
      }
    }
  `;

  const response = await client.octokit.graphql<{
    addDiscussionComment: {
      comment: DiscussionComment;
    };
  }>(mutation, {
    discussionId,
    body,
  });

  return response.addDiscussionComment.comment;
}
