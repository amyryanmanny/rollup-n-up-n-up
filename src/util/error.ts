import { RequestError } from "@octokit/request-error";

export function isOctokitRequestError(error: unknown): error is RequestError {
  return (
    error instanceof RequestError ||
    (error as { name?: string }).name === "HttpError"
  );
}
