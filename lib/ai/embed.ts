import "server-only";

export function getEmbeddingConfig(): {
  apiKey: string;
  model: string;
  dimensions: number;
} {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Set it before seeding so guide chunks can be embedded.",
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

  return { apiKey, model, dimensions };
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { apiKey, model, dimensions } = getEmbeddingConfig();
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: texts, model, dimensions }),
  });

  if (!response.ok) {
    throw new Error(`Embedding provider returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    throw new Error("Embedding provider returned an invalid response.");
  }

  const embeddings = new Array<number[]>(texts.length);
  for (const item of payload.data) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("index" in item) ||
      typeof item.index !== "number" ||
      !Number.isInteger(item.index) ||
      item.index < 0 ||
      item.index >= texts.length ||
      !("embedding" in item) ||
      !Array.isArray(item.embedding) ||
      item.embedding.length !== dimensions ||
      !item.embedding.every(
        (value: unknown) => typeof value === "number" && Number.isFinite(value),
      )
    ) {
      throw new Error(
        "Embedding provider returned a missing, invalid, or incorrectly sized embedding.",
      );
    }

    embeddings[item.index] = item.embedding;
  }

  if (embeddings.some((embedding) => !embedding)) {
    throw new Error("Embedding provider returned fewer vectors than requested.");
  }

  return embeddings;
}
