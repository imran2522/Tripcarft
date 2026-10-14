import { google } from "@ai-sdk/google";
import "server-only";

export function chatModel() {
  const model = process.env.GEMINI_CHAT_MODEL;
  if (!model) {
    throw new Error(
      "GEMINI_CHAT_MODEL is missing. Set it to a currently available model in Google AI Studio.",
    );
  }

  return google(model);
}
