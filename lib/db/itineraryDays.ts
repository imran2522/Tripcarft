import { ObjectId, type ClientSession } from "mongodb";
import "server-only";

import type { ItineraryDayItem } from "@/lib/db/types";
import { getItineraryDays } from "@/lib/mongodb";

export interface ItineraryDayInput {
  dayNumber: number;
  date: Date;
  destinationId: ObjectId;
  title: string;
  items: ItineraryDayItem[];
  notes?: string;
}

export async function saveItineraryDays(
  tripId: ObjectId,
  ownerId: string,
  days: ItineraryDayInput[],
  session?: ClientSession,
): Promise<void> {
  const dayNumbers = new Set<number>();
  for (const { dayNumber } of days) {
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      throw new Error("Itinerary day numbers must be positive integers.");
    }
    if (dayNumbers.has(dayNumber)) {
      throw new Error(`Duplicate itinerary day number: ${dayNumber}.`);
    }
    dayNumbers.add(dayNumber);
  }

  if (days.length === 0) {
    return;
  }

  const collection = await getItineraryDays();
  const now = new Date();

  await collection.bulkWrite(
    days.map((day) => ({
      updateOne: {
        filter: { tripId, dayNumber: day.dayNumber },
        update: {
          $set: {
            tripId,
            ownerId,
            dayNumber: day.dayNumber,
            date: day.date,
            destinationId: day.destinationId,
            title: day.title,
            items: day.items,
            updatedAt: now,
            ...(day.notes === undefined ? {} : { notes: day.notes }),
          },
          ...(day.notes === undefined ? { $unset: { notes: "" } } : {}),
          $setOnInsert: { _id: new ObjectId(), createdAt: now },
        },
        upsert: true,
      },
    })),
    session ? { session } : undefined,
  );
}
