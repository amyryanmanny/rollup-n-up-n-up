import { GitHubPushClient } from "./github/client";
import { getPushConfig } from "@util/config/push";

const client = new GitHubPushClient();

const { targets, title, body } = getPushConfig();
client.pushAll(targets, title, body);
