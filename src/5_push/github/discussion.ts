// TODO: Refactor GET requests to be in the @pull module
import type { GitHubPushClient } from "./client";

export type Discussion = {
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
};

type DiscussionCategory = {
  id: string;
  name: string;
  slug: string;
};

async function getRepositoryId(
  client: GitHubPushClient,
  owner: string,
  repo: string,
): Promise<string> {
  const query = `
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
      }
    }
  `;

  const response = await client.octokit.graphql<{
    repository: {
      id: string;
    };
  }>(query, { owner, repo });

  return response.repository.id;
}

export async function getDiscussionByNumber(
  client: GitHubPushClient,
  owner: string,
  repo: string,
  discussionNumber: number,
): Promise<Discussion | undefined> {
  const query = `
    query ($owner: String!, $repo: String!, $discussionNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        discussion(number: $discussionNumber) {
          id
          number
          title
          body
          url
        }
      }
    }
  `;

  const response = await client.octokit.graphql<{
    repository: {
      discussion: Discussion;
    };
  }>(query, {
    owner,
    repo,
    discussionNumber,
  });

  return response.repository.discussion;
}

export async function getDiscussionByTitle(
  client: GitHubPushClient,
  owner: string,
  repo: string,
  title: string,
): Promise<Discussion | undefined> {
  const query = `
    query ($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        discussions(first: 100, after: $cursor) {
          nodes {
            id
            number
            title
            body
            url
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `;

  const response = await client.octokit.graphql.paginate<{
    repository: {
      discussions: {
        nodes: Discussion[];
      };
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
    };
  }>(query, {
    owner,
    repo,
  });

  return response.repository.discussions.nodes.find(
    (discussion) => discussion.title === title,
  );
}

export async function getDiscussionCategoryId(
  client: GitHubPushClient,
  owner: string,
  repo: string,
  categoryName: string,
): Promise<string> {
  const discussionCategoryQuery = `
    query ($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        discussionCategories(first: 100, after: $cursor) {
          nodes {
            id
            name
            slug
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  `;

  const response = await client.octokit.graphql.paginate<{
    repository: {
      discussionCategories: {
        nodes: Array<DiscussionCategory>;
        pageInfo: {
          endCursor: string;
          hasNextPage: boolean;
        };
      };
    };
  }>(discussionCategoryQuery, { repo, owner });

  const categoryId = response.repository.discussionCategories.nodes
    .map((category) => ({
      id: category.id,
      slug: category.slug,
    }))
    .find((category) => category.slug === categoryName)?.id;
  if (!categoryId) {
    throw new Error(
      `Discussion category "${categoryName}" not found in repository ${owner}/${repo}`,
    );
  }
  return categoryId;
}

export async function createDiscussion(
  client: GitHubPushClient,
  owner: string,
  repo: string,
  categoryId: string,
  title: string,
  body: string,
): Promise<Discussion> {
  const mutation = `
    mutation ($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repositoryId,
        categoryId: $categoryId,
        title: $title,
        body: $body
      }) {
        discussion {
          id
          number
          title
          body
          url
        }
      }
    }
  `;

  const repositoryId = await getRepositoryId(client, owner, repo);

  const response = await client.octokit.graphql<{
    createDiscussion: {
      discussion: Discussion;
    };
  }>(mutation, {
    repositoryId,
    categoryId,
    title,
    body,
  });

  return response.createDiscussion.discussion;
}

export async function updateDiscussion(
  client: GitHubPushClient,
  discussionId: string,
  body: string,
): Promise<Discussion> {
  const mutation = `
    mutation ($discussionId: ID!, $body: String!) {
      updateDiscussion(input: {
        discussionId: $discussionId,
        body: $body
      }) {
        discussion {
          id
          number
          title
          body
          url
        }
      }
    }
  `;

  const response = await client.octokit.graphql<{
    updateDiscussion: {
      discussion: Discussion;
    };
  }>(mutation, {
    discussionId,
    body,
  });

  return response.updateDiscussion.discussion;
}
