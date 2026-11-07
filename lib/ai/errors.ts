import { APICallError, RetryError } from "ai";

export const AI_QUOTA_BUSY_MESSAGE =
  "The free AI quota is busy — try again in a minute";

export function isRateLimitError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return error.statusCode === 429;
  }

  if (RetryError.isInstance(error)) {
    return error.errors.some(isRateLimitError);
  }

  if (typeof error === "object" && error !== null && "cause" in error) {
    return isRateLimitError(error.cause);
  }

  return false;
}
