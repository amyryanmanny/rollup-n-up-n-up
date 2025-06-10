import { getOctokit } from "./src/octokit";

const octokit = getOctokit();

// Use it
octokit.request("GET /user").then((response) => {
  console.info(response.data);
});
