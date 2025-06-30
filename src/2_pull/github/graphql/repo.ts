import type { GitHubClient } from "../client";
import type { Issue } from "../issue";

export type ListIssuesForRepoParameters = {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
};

type ListIssuesForRepoResponse = {
  issues: Issue[];
  title: string;
  url: string;
};

export async function listIssuesForRepo(
  client: GitHubClient,
  params: ListIssuesForRepoParameters,
): Promise<ListIssuesForRepoResponse> {
  const query = `
    query paginate($owner: String!, $repo: String!, $cursor: String) {
      repositoryOwner(login: $owner) {
        repository(name: $repo) {
          issues(first: 100) {
            nodes {
              title
              body
              url
              number
              assignees(first: 5) {
                nodes {
                  login
                }
              }
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
              comments(last: 100) {
                nodes {
                  author {
                    login
                  }
                  body
                  createdAt
                  url
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await client.octokit.graphql.paginate<{
    repositoryOwner: {
      repository: {
        issues: {
          nodes: Array<{
            title: string;
            body: string;
            url: string;
            number: number;
            assignees: {
              nodes: Array<{ login: string }>;
            };
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
            comments: {
              nodes: Array<{
                author: {
                  login: string;
                };
                body: string;
                createdAt: string; // ISO 8601 date string
                url: string;
              }>;
            };
          }>;
        };
      };
    };
  }>(query, {
    owner: params.owner,
    repo: params.repo,
  });

  const issues = response.repositoryOwner.repository.issues.nodes.map(
    (issue) => ({
      title: issue.title,
      body: issue.body,
      url: issue.url,
      number: issue.number,
      assignees: issue.assignees.nodes.map((assignee) => assignee.login),
      type: issue.issueType?.name || "Issue",
      repository: {
        name: issue.repository.name,
        owner: issue.repository.owner.login,
        nameWithOwner: issue.repository.nameWithOwner,
      },
      comments: issue.comments.nodes.map((comment) => ({
        author: comment.author.login,
        body: comment.body,
        createdAt: new Date(comment.createdAt),
        url: comment.url,
      })),
    }),
  );

  return {
    issues,
    title: `Issues for ${params.owner}/${params.repo}`,
    url: `https://github.com/${params.owner}/${params.repo}`,
  };
}
