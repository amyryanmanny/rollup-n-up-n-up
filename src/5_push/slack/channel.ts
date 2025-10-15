export async function getChannelIdFromName(channelName: string) {
  if (channelName.startsWith("#")) {
    channelName = channelName.slice(1);
  }

  // Some API

  if (channelName === "synapse-team") {
    return "C08PK08917F";
  }

  throw new Error("Not supported");
}
