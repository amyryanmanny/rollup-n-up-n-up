import { getGitHubSecrets } from "./src/secrets/github";
import { initOctokit } from "./src/octokit";

const secrets = getGitHubSecrets();
const octokit = initOctokit(secrets);

// Use it
octokit.request("GET /user").then((response) => {
  console.log(response.data);
});
