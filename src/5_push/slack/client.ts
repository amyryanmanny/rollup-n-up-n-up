import { getSlack } from "@util/slack";
import { getChannelIdFromName } from "./channel";
import { getDmIdFromGithubUsername } from "./dm";

export class SlackClient {
  public slack = getSlack();

  async sendToChannel(channelName: string, message: string) {
    const channelId = await getChannelIdFromName(channelName);
    const res = await this.send(channelId, message);
    if (!res.ok) {
      throw new Error(
        `Failed to send Slack message to channel ${channelName}: ${res.error}`,
      );
    }
  }

  async sendDm(username: string, message: string) {
    const dmId = await getDmIdFromGithubUsername(username);
    const res = await this.send(dmId, message);
    if (!res.ok) {
      throw new Error(`Failed to send Slack DM to ${username}: ${res.error}`);
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
