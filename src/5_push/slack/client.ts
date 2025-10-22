import { getSlack } from "@util/slack";

import { getChannelIdFromName } from "./channel";
import { getDmIdFromGithubUsername } from "./dm";

import { getConfig, isTruthy } from "@util/config";
import { emitError, emitInfo } from "@util/log";

import { isDuplicate } from "./util";

export const SLACK_MUTE = isTruthy(getConfig("SLACK_MUTE"));

export class SlackClient {
  public slack = getSlack();

  async sendToChannel(channelName: string, message: string) {
    if (isDuplicate(channelName, message)) {
      return;
    }

    if (SLACK_MUTE) {
      emitInfo(`[SLACK_MUTE=true] Skipping Slack message to #${channelName}`);
      return;
    }

    const channelId = await getChannelIdFromName(channelName);
    const res = await this.send(channelId, message);
    if (!res.ok) {
      throw new Error(
        `Failed to send Slack message to channel ${channelName}: ${res.error}`,
      );
    }
  }

  async sendDm(username: string, message: string) {
    if (isDuplicate(username, message)) {
      // Prevent sending duplicate messages in the same run
      return;
    }

    if (SLACK_MUTE) {
      emitInfo(`[SLACK_MUTE=true] Skipping Slack message to @${username}`);
      return;
    }

    const dmId = await getDmIdFromGithubUsername(username);
    const res = await this.send(dmId, message);
    if (!res.ok) {
      // Don't throw, since we don't want to fail in the middle of sending DMs, it's hard to retry
      emitError(`Failed to send Slack DM to ${username}: ${res.error}`);
    }
  }

  private async send(conversationId: string, message: string) {
    // conversationId can be a channel ID, DM ID, MPDM ID, or Group ID

    // See: https://docs.slack.dev/reference/methods/chat.postMessage
    const res = await this.slack.chat.postMessage({
      channel: conversationId,
      text: message,
    });

    return res;
  }
}
