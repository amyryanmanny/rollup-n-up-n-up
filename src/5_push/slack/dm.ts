import { getConfig } from "@config";
import { getSlack } from "@util/slack";

const DEFAULT_ENTERPRISE_DOMAIN = "github.com";

export async function getDmIdFromGithubUsername(
  username: string,
): Promise<string> {
  // This only works if the email stem is the same as the GitHub username
  const slack = getSlack();

  // Remove leading '@' if present
  if (username.startsWith("@")) {
    username = username.slice(1);
  }

  const enterpriseDomain =
    getConfig("SLACK_ENTERPRISE_DOMAIN") || DEFAULT_ENTERPRISE_DOMAIN;
  const response = await slack.users.lookupByEmail({
    email: `${username}@${enterpriseDomain}`,
  });

  if (!response.ok) {
    throw new Error(
      `Error looking up Slack user by email for username "${username}": ${response.error}`,
    );
  }

  if (!response.user || !response.user.id) {
    throw new Error(`No Slack user found for username "${username}"`);
  }

  return response.user.id;
}
