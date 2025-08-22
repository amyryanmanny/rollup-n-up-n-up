import type { GetChatCompletionsDefaultResponse } from "@azure-rest/ai-inference";
import { RequestError } from "@octokit/request-error";

export function isOctokitRequestError(error: unknown): error is RequestError {
  return (
    error instanceof RequestError ||
    (error as { name?: string }).name === "HttpError"
  );
}

export function handleUnexpectedResponse(
  response: GetChatCompletionsDefaultResponse,
): never {
  // https://github.com/actions/ai-inference/blob/7e2aa19f3be272fc4eef414374885e513eacd663/src/helpers.ts#L37
  // Extract x-ms-error-code from headers if available
  const errorCode = response.headers["x-ms-error-code"];
  const errorCodeMsg = errorCode ? ` (error code: ${errorCode})` : "";

  // Check if response body exists and contains error details
  if (response.body && response.body.error) {
    throw response.body.error;
  }

  // Handle case where response body is missing
  if (!response.body) {
    throw new Error(
      `Failed to get response from AI service (status: ${response.status})${errorCodeMsg}. ` +
        "Please check network connection and endpoint configuration.",
    );
  }

  // Handle other error cases
  throw new Error(
    `AI service returned error response (status: ${response.status})${errorCodeMsg}: ` +
      (typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body)),
  );
}
