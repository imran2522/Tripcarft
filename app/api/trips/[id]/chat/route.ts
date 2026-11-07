import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { auth } from "@/auth";
import { AI_QUOTA_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai/errors";
import type { ItineraryDay, Trip } from "@/lib/db/types";
import {
  countChatMessagesToday,
  DAILY_CHAT_MESSAGE_LIMIT,
} from "@/lib/db/usage";
import { clientPromise, getItineraryDays, getTrips } from "@/lib/mongodb";
import { reviseItineraryDay } from "@/lib/rag/reviseItineraryDay";

export const maxDuration = 60;

type DayUpdateData = Omit<
  Pick<ItineraryDay, "dayNumber" | "date" | "title" | "items" | "notes">,
  "date"
> & {
  _id: string;
  date: string;
  updatedAt: string;
};

type ChatMessage = UIMessage<unknown, { "day-update": DayUpdateData }>;

const requestSchema = z.strictObject({
  dayNumber: z.number().int().positive(),
  instruction: z.string().trim().min(1).max(4000),
});

class ConcurrentDayEditError extends Error {}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const sessionUser = (await auth())?.user;
  if (!sessionUser?.id) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
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
      { error: "Invalid chat edit.", issues: parsedRequest.error.issues },
      { status: 400 },
    );
  }

  const tripId = new ObjectId(id);
  const trips = await getTrips();
  const trip = await trips.findOne({ _id: tripId, ownerId: sessionUser.id });
  if (!trip) {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  const chatMessagesToday = await countChatMessagesToday(sessionUser.id);
  if (chatMessagesToday >= DAILY_CHAT_MESSAGE_LIMIT) {
    return Response.json(
      { error: "Daily chat limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  const itineraryDays = await getItineraryDays();
  const day = await itineraryDays.findOne({
    tripId,
    ownerId: sessionUser.id,
    dayNumber: parsedRequest.data.dayNumber,
  });
  if (!day) {
    return Response.json({ error: "Itinerary day not found." }, { status: 404 });
  }

  const stream = createUIMessageStream<ChatMessage>({
    async execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({
        type: "text-start",
        id: "edit-status",
      });
      writer.write({
        type: "text-delta",
        id: "edit-status",
        delta: `Updating day ${day.dayNumber}...`,
      });
      writer.write({
        type: "text-end",
        id: "edit-status",
      });

      try {
        const revision = await reviseItineraryDay(
          trip.brief,
          day,
          parsedRequest.data.instruction,
        );
        const now = new Date();
        const assistantMessage = `Updated day ${day.dayNumber}: ${revision.title}`;
        const chatEntries: Trip["chatHistory"] = [
          {
            role: "user",
            content: parsedRequest.data.instruction,
            createdAt: now,
          },
          {
            role: "assistant",
            content: assistantMessage,
            createdAt: now,
          },
        ];
        const client = await clientPromise;
        const dbSession = client.startSession();

        try {
          await dbSession.withTransaction(async () => {
            const dayUpdate = await itineraryDays.updateOne(
              {
                _id: day._id,
                tripId,
                ownerId: sessionUser.id,
                updatedAt: day.updatedAt,
              },
              {
                $set: {
                  title: revision.title,
                  items: revision.items,
                  notes: revision.notes,
                  updatedAt: now,
                },
              },
              { session: dbSession },
            );
            if (dayUpdate.matchedCount !== 1) {
              throw new ConcurrentDayEditError(
                "The itinerary day changed while the edit was being generated.",
              );
            }

            const tripUpdate = await trips.updateOne(
              { _id: tripId, ownerId: sessionUser.id },
              [
                {
                  $set: {
                    chatHistory: {
                      $concatArrays: [
                        { $ifNull: ["$chatHistory", []] },
                        { $literal: chatEntries },
                      ],
                    },
                    updatedAt: { $literal: now },
                  },
                },
              ],
              { session: dbSession },
            );
            if (tripUpdate.matchedCount !== 1) {
              throw new Error("Trip disappeared while saving the chat edit.");
            }
          });
        } finally {
          await dbSession.endSession();
        }

        writer.write({
          type: "text-start",
          id: "edit-reply",
        });
        writer.write({
          type: "text-delta",
          id: "edit-reply",
          delta: assistantMessage,
        });
        writer.write({
          type: "text-end",
          id: "edit-reply",
        });
        writer.write({
          type: "data-day-update",
          data: {
            _id: day._id.toHexString(),
            dayNumber: day.dayNumber,
            date: day.date.toISOString(),
            title: revision.title,
            items: revision.items,
            notes: revision.notes,
            updatedAt: now.toISOString(),
          },
        });
        writer.setOutcome({ status: "completed" });
      } catch (error) {
        if (error instanceof ConcurrentDayEditError) {
          writer.write({
            type: "error",
            errorText: "This day changed during the edit. Reload it and try again.",
          });
          writer.setOutcome({ status: "failed", error });
          return;
        }

        console.error("Trip chat edit failed:", error);
        writer.write({
          type: "error",
          errorText: isRateLimitError(error)
            ? AI_QUOTA_BUSY_MESSAGE
            : "Unable to update the itinerary day.",
        });
        writer.setOutcome({ status: "failed", error });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    keepAliveMs: 15_000,
  });
}
