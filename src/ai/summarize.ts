import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export async function quickSummarize(content: string): Promise<string> {
  try {
    // Load prompt content - required
    const prompt = `
    Summarize the following updates into a rollup for the Synapse team.

    Use the following format for the rollup:

    TL;DR: <summary of the updates>

    🎉 Wins/Accomplishments (Subsections "What We Shipped" and "What We're Learning")

    📣 FYI

    🆘 SOS/Need Support

    Here is the content to summarize:
    START CONTENT
    ${content}
    END CONTENT
    `;

    // Load system prompt with default value
    const systemPrompt =
      "You are a helpful assistant summarizing Issues and Comments into a concise rollup.";

    const modelName: string = "gpt-4.1";
    const maxTokens: number = 800;

    const token = await getToken();

    const endpoint = "https://models.inference.ai.azure.com";

    const client = ModelClient(endpoint, new AzureKeyCredential(token), {
      userAgentOptions: { userAgentPrefix: "github-actions-rollup-n-up" },
    });

    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        model: modelName,
      },
    });

    if (isUnexpected(response)) {
      if (response.body.error) {
        throw response.body.error;
      }
      throw new Error(
        "An error occurred while fetching the response (" +
          response.status +
          "): " +
          response.body,
      );
    }

    const modelResponse: string | null =
      response.body.choices[0].message.content;

    return modelResponse ?? "No response from model";
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      return `ERROR: ${error.message}`;
    } else {
      return "An unexpected error occurred";
    }
  }
}
