import { ObjectId } from "mongodb";
import { z } from "zod";

import { auth } from "@/auth";
import { saveItineraryDays } from "@/lib/db/itineraryDays";
import type { Trip } from "@/lib/db/types";
import { clientPromise, getDestinations, getTrips } from "@/lib/mongodb";
import { generateItinerary } from "@/lib/rag/generateItinerary";

// Retrieval and model generation both run inside this request.
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
  })
  .refine(
    (brief) =>
      Math.floor(
        (Date.UTC(
          brief.endDate.getUTCFullYear(),
          brief.endDate.getUTCMonth(),
          brief.endDate.getUTCDate(),
        ) -
          Date.UTC(
            brief.startDate.getUTCFullYear(),
            brief.startDate.getUTCMonth(),
            brief.startDate.getUTCDate(),
          )) /
          86_400_000,
      ) < 31,
    {
      message: "A trip cannot exceed 31 calendar days.",
      path: ["endDate"],
    },
  );

const requestSchema = z.strictObject({
  brief: tripBriefSchema,
});

function citySlug(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request): Promise<Response> {
  const sessionUser = (await auth())?.user;
  if (!sessionUser?.id) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
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
    const brief = parsedRequest.data.brief;
    const citySlugs = [...new Set(brief.cities.map(citySlug))];
    const destinations = await (
      await getDestinations()
    )
      .find({ slug: { $in: citySlugs } })
      .project({ _id: 1, slug: 1 })
      .toArray();
    const destinationIds = new Map(
      destinations.map(({ _id, slug }) => [slug, _id]),
    );
    const unmatchedCities = brief.cities.filter(
      (city) => !destinationIds.has(citySlug(city)),
    );
    if (unmatchedCities.length > 0) {
      return Response.json(
        {
          error: "One or more cities do not have destination guide content.",
          cities: unmatchedCities,
        },
        { status: 422 },
      );
    }

    const days = await generateItinerary(brief);
    const dayDestinationIds = days.map(({ city }) => {
      const destinationId = destinationIds.get(citySlug(city));
      if (!destinationId) {
        throw new Error(`No destination guide found for ${city}.`);
      }

      return destinationId;
    });
    const tripId = new ObjectId();
    const now = new Date();
    const trip: Trip = {
      _id: tripId,
      ownerId: sessionUser.id,
      title: `${brief.cities.join(", ")} trip`,
      brief,
      destinationIds: [
        ...new Map(
          dayDestinationIds.map((destinationId) => [
            destinationId.toHexString(),
            destinationId,
          ]),
        ).values(),
      ],
      status: "generated",
      share: { enabled: false },
      chatHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    const client = await clientPromise;
    const dbSession = client.startSession();
    try {
      await dbSession.withTransaction(async () => {
        await (await getTrips()).insertOne(trip, { session: dbSession });
        await saveItineraryDays(
          tripId,
          sessionUser.id,
          days.map((day, index) => ({
            dayNumber: day.dayNumber,
            date: new Date(
              Date.UTC(
                brief.startDate.getUTCFullYear(),
                brief.startDate.getUTCMonth(),
                brief.startDate.getUTCDate() + day.dayNumber - 1,
              ),
            ),
            destinationId: dayDestinationIds[index],
            title: day.title,
            items: day.items,
          })),
          dbSession,
        );
      });
    } finally {
      await dbSession.endSession();
    }

    return Response.json(
      { tripId: tripId.toHexString(), days },
      { status: 201 },
    );
  } catch (error) {
    console.error("Trip itinerary generation and save failed:", error);
    return Response.json(
      { error: "Unable to generate and save the itinerary." },
      { status: 500 },
    );
  }
}
