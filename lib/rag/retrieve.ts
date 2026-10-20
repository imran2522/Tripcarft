import "server-only";

import type { GuideChunk, Trip } from "@/lib/db/types";
import { getDestinations } from "@/lib/mongodb";
import { embedQuery } from "@/lib/ai/embed";

const VECTOR_INDEX_NAME = "destination-guide-chunks";
const DEFAULT_RESULT_LIMIT = 5;
const MAX_RESULT_LIMIT = 100;

interface RetrievalCandidate {
  slug: string;
  name: string;
  country: string;
  guideChunks: GuideChunk[];
}

export interface RetrievedGuideChunk {
  id: string;
  topic: string;
  text: string;
  destination: {
    slug: string;
    name: string;
    country: string;
  };
  score: number;
}

function formatBrief(brief: Trip["brief"]): string {
  return [
    `Cities: ${brief.cities.join(", ")}`,
    `Dates: ${brief.startDate.toISOString()} to ${brief.endDate.toISOString()}`,
    `Interests: ${brief.interests.join(", ")}`,
    `Budget: ${brief.budget}`,
    brief.notes ? `Notes: ${brief.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
      return Number.NEGATIVE_INFINITY;
    }

    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return dotProduct / Math.sqrt(leftMagnitude * rightMagnitude);
}

export async function retrieveGuideChunks(
  brief: Trip["brief"],
  limit = DEFAULT_RESULT_LIMIT,
): Promise<RetrievedGuideChunk[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULT_LIMIT) {
    throw new Error(
      `Retrieval limit must be an integer between 1 and ${MAX_RESULT_LIMIT}.`,
    );
  }

  const queryVector = await embedQuery(formatBrief(brief));
  const candidateLimit = limit * 20;
  const candidates = await (
    await getDestinations()
  )
    .aggregate<RetrievalCandidate>([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "guideChunks.embedding",
          queryVector,
          numCandidates: Math.min(candidateLimit * 20, 10_000),
          limit: candidateLimit,
        },
      },
      {
        $project: {
          _id: 0,
          slug: 1,
          name: 1,
          country: 1,
          guideChunks: 1,
        },
      },
    ])
    .toArray();

  const matchingChunks: RetrievedGuideChunk[] = [];
  for (const destination of candidates) {
    for (const chunk of destination.guideChunks) {
      if (
        !chunk.embedding ||
        chunk.embedding.length !== queryVector.length
      ) {
        continue;
      }

      const score = cosineSimilarity(queryVector, chunk.embedding);
      if (!Number.isFinite(score)) {
        continue;
      }

      matchingChunks.push({
        id: chunk.id,
        topic: chunk.topic,
        text: chunk.text,
        destination: {
          slug: destination.slug,
          name: destination.name,
          country: destination.country,
        },
        score,
      });
    }
  }

  return matchingChunks
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
