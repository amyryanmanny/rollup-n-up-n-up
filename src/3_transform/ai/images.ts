// https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/how-to/use-chat-multi-modal?pivots=programming-language-javascript#use-chat-completions-with-images
export async function loadImage(imageUrl: string): Promise<string> {
  // Reads an image from URL and serializes it to a data URL
  const imageFormat = imageUrl.split(".").pop() || "jpeg";
  const response = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const imageData = await response.arrayBuffer();
  const imageDataBase64 = Buffer.from(imageData).toString("base64");
  const dataUrl = `data:image/${imageFormat};base64,${imageDataBase64}`;

  return dataUrl;
}

// {
//   role: "user",
//   content: [
//     {
//       type: "text",
//       text: "Which conclusion can be extracted from the following chart?",
//     },
//     {
//       type: "image_url",
//       image: {
//         url: data_url,
//       },
//     },
// }
