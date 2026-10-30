import { z } from "zod";

import { generateItinerary } from "@/lib/rag/generateItinerary";

export const maxDuration = 60;

const dateSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((value) => new Date(value));

const tripBriefSchema = z
  .strictObject({
    cities: z.array(z.string().trim().min(1)).min(1).max(20),
    startDate: dateSchema,
    endDate: dateSchema,
    interests: z.array(z.string().trim().min(1)).max(20),
    budget: z.enum(["low", "mid", "high"]),
    notes: z.string().max(4000).optional(),
  })
  .refine((brief) => brief.endDate > brief.startDate, {
    message: "endDate must be after startDate.",
    path: ["endDate"],
  });

const requestSchema = z.strictObject({
  brief: tripBriefSchema,
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    throw error;
  }

  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return Response.json(
      { error: "Invalid trip brief.", issues: parsedRequest.error.issues },
      { status: 400 },
    );
  }

  try {
    const items = await generateItinerary(parsedRequest.data.brief);
    return Response.json({ items });
  } catch (error) {
    console.error("Trip itinerary generation failed:", error);
    return Response.json(
      { error: "Unable to generate the itinerary." },
      { status: 500 },
    );
  }
}
