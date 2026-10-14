import { google } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import "server-only";

export function getEmbeddingConfig(): {
  model: string;
  dimensions: number;
} {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is missing. Set it before seeding so guide chunks can be embedded.",
    );
  }

  const model = process.env.EMBEDDING_MODEL;
  if (!model) {
    throw new Error("EMBEDDING_MODEL is missing.");
  }

  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS);
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 8192) {
    throw new Error(
      "EMBEDDING_DIMENSIONS must be an integer between 1 and 8192.",
    );
  }

  return { model, dimensions };
}

function validateEmbeddings(
  embeddings: unknown,
  expectedCount: number,
  dimensions: number,
): number[][] {
  if (!Array.isArray(embeddings) || embeddings.length !== expectedCount) {
    throw new Error(
      "Embedding provider returned a different number of vectors than requested.",
    );
  }

  const validatedEmbeddings: number[][] = [];
  for (const embedding of embeddings) {
    if (
      !Array.isArray(embedding) ||
      embedding.length !== dimensions ||
      !embedding.every(
        (value: unknown) => typeof value === "number" && Number.isFinite(value),
      )
    ) {
      throw new Error(
        "Embedding provider returned an invalid or incorrectly sized embedding.",
      );
    }

    validatedEmbeddings.push(embedding);
  }

  return validatedEmbeddings;
}

async function requestEmbeddings<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const message =
      error instanceof Error
        ? error.message
        : "Embedding provider request failed.";
    throw new Error(apiKey ? message.replaceAll(apiKey, "[redacted]") : message);
  }
}

export async function embedDocuments(
  items: { topic: string; text: string }[],
): Promise<number[][]> {
  const { model, dimensions } = getEmbeddingConfig();
  const values = items.map(({ topic, text }) =>
    model === "gemini-embedding-2" ? `title: ${topic} | text: ${text}` : text,
  );
  const providerOptions = {
    google: {
      outputDimensionality: dimensions,
      ...(model === "gemini-embedding-001"
        ? { taskType: "RETRIEVAL_DOCUMENT" as const }
        : {}),
    },
  };
  const { embeddings } = await requestEmbeddings(() =>
    embedMany({
      model: google.embedding(model),
      values,
      providerOptions,
    }),
  );

  return validateEmbeddings(embeddings, items.length, dimensions);
}

export async function embedQuery(text: string): Promise<number[]> {
  const { model, dimensions } = getEmbeddingConfig();
  const value =
    model === "gemini-embedding-2"
      ? `task: search result | query: ${text}`
      : text;
  const providerOptions = {
    google: {
      outputDimensionality: dimensions,
      ...(model === "gemini-embedding-001"
        ? { taskType: "RETRIEVAL_QUERY" as const }
        : {}),
    },
  };
  const { embedding } = await requestEmbeddings(() =>
    embed({
      model: google.embedding(model),
      value,
      providerOptions,
    }),
  );

  return validateEmbeddings([embedding], 1, dimensions)[0];
}
