import { GitHubPushClient } from "./github/client";
import { getPushConfig } from "@util/config/push";

const client = new GitHubPushClient();

const { title, body, pushTargets, fetchTargets } = getPushConfig();

if (pushTargets) {
  client.pushAll(pushTargets, title, body!);
}

if (fetchTargets) {
  client.fetchAll(fetchTargets, title);
}
