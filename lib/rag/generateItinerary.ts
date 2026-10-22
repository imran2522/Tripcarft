import { generateText, Output } from "ai";
import { z } from "zod";
import "server-only";

import { chatModel } from "@/lib/ai/provider";
import type { ItineraryDayItem, Trip } from "@/lib/db/types";
import { retrieveGuideChunks } from "@/lib/rag/retrieve";

const itineraryDayItemSchema = z.object({
  time: z.string().optional(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["food", "sight", "activity", "transport", "rest"]),
  durationMinutes: z.number().int().positive().optional(),
  sourceChunkIds: z.array(z.string()),
});

export async function generateItinerary(
  brief: Trip["brief"],
): Promise<ItineraryDayItem[]> {
  const chunks = await retrieveGuideChunks(brief);
  const formattedBrief = {
    ...brief,
    startDate: brief.startDate.toISOString(),
    endDate: brief.endDate.toISOString(),
  };
  const context = chunks.map(({ id, topic, text, destination }) => ({
    id,
    topic,
    text,
    destination,
  }));

  const { output } = await generateText({
    model: chatModel(),
    system:
      "Create a practical itinerary from the trip brief and retrieved guide chunks. Ground recommendations in the supplied chunks; do not invent specific places or factual details. Every item's sourceChunkIds must contain only IDs of chunks that support it.",
    output: Output.array({ element: itineraryDayItemSchema }),
    prompt: [
      "Trip brief:",
      JSON.stringify(formattedBrief, null, 2),
      "",
      "Retrieved guide chunks:",
      JSON.stringify(context, null, 2),
    ].join("\n"),
  });

  return output;
}
