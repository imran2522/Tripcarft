import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import "server-only";

export function chatModel() {
  const provider = process.env.AI_CHAT_PROVIDER ?? "google";

  if (provider === "google") {
    const model = process.env.GEMINI_CHAT_MODEL;
    if (!model) {
      throw new Error(
        "GEMINI_CHAT_MODEL is missing. Set it to a currently available model in Google AI Studio.",
      );
    }

    return google(model);
  }

  if (provider === "groq") {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing.");
    }

    const model = process.env.GROQ_CHAT_MODEL;
    if (!model) {
      throw new Error("GROQ_CHAT_MODEL is missing.");
    }

    return groq(model);
  }

  throw new Error(
    `Unsupported AI_CHAT_PROVIDER "${provider}". Choose "google" or "groq".`,
  );
}
