import { getOctokit } from "@util/octokit";

export async function checkGraphQLRateLimit() {
  const octokit = getOctokit();

  const query = `
    query {
      viewer {
        login
      }
      rateLimit {
        limit
        remaining
        used
        resetAt
      }
    }
  `;

  const response = await octokit.graphql<{
    viewer: { login: string };
    rateLimit: {
      limit: number;
      remaining: number;
      used: number;
      resetAt: string;
    };
  }>(query);

  console.log(JSON.stringify(response, null, 2));
}

await checkGraphQLRateLimit();
