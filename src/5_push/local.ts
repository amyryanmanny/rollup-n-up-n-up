import { GitHubPushClient, type PushTarget } from "./github/client";

const title = "Test Title";
const body = `Test Body ${Math.floor(Math.random() * 1000)}`;

// Debugging inputs
const configs: PushTarget[] = [
  {
    url: "https://github.com/amyryanmanny/rollup-n-up-n-up/discussions/categories/general",
    type: "discussion",
  },
];

// Perform the push operation with the provided title and body
const client = new GitHubPushClient();
client.pushAll(configs, title, body);
