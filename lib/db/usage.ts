import "server-only";

import { getTrips } from "@/lib/mongodb";

export const DAILY_TRIP_LIMIT = 3;
export const DAILY_CHAT_MESSAGE_LIMIT = 20;

function getUtcDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start.getTime() + 86_400_000);

  return { start, end };
}

export async function countTripsCreatedToday(
  ownerId: string,
  date = new Date(),
): Promise<number> {
  const { start, end } = getUtcDayBounds(date);

  return (await getTrips()).countDocuments({
    ownerId,
    createdAt: { $gte: start, $lt: end },
  });
}

export async function countChatMessagesToday(
  ownerId: string,
  date = new Date(),
): Promise<number> {
  const { start, end } = getUtcDayBounds(date);
  const trips = await getTrips();
  const [result] = await trips
    .aggregate<{ count: number }>([
      {
        $match: {
          ownerId,
          chatHistory: {
            $elemMatch: {
              role: "user",
              createdAt: { $gte: start, $lt: end },
            },
          },
        },
      },
      {
        $project: {
          count: {
            $size: {
              $filter: {
                input: "$chatHistory",
                as: "message",
                cond: {
                  $and: [
                    { $eq: ["$$message.role", "user"] },
                    { $gte: ["$$message.createdAt", start] },
                    { $lt: ["$$message.createdAt", end] },
                  ],
                },
              },
            },
          },
        },
      },
      { $group: { _id: null, count: { $sum: "$count" } } },
    ])
    .toArray();

  return result?.count ?? 0;
}
