import { getSlack } from "@util/slack";
import { getChannelIdFromName } from "./channel";
import { getDmIdFromUsername } from "./dm";

export class SlackClient {
  public slack = getSlack();

  async sendToChannel(channelName: string, message: string) {
    const channelId = getChannelIdFromName(channelName);
    return await this.send(channelId, message);
  }

  async sendDm(username: string, message: string) {
    const dmId = getDmIdFromUsername(username);
    return await this.send(dmId, message);
  }

  private async send(conversationId: string, message: string) {
    // This argument can be a channel ID, a DM ID, a MPDM ID, or a Group ID

    // See: https://docs.slack.dev/reference/methods/chat.postMessage
    const res = await this.slack.chat.postMessage({
      channel: conversationId,
      text: message,
    });

    console.log("Message sent: ", res.ts);

    return res;
  }
}
