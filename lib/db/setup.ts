import "server-only";

import type { Db, Document } from "mongodb";
import { getDb } from "@/lib/mongodb";

const destinationsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "_id",
      "slug",
      "name",
      "country",
      "region",
      "summary",
      "tags",
      "bestMonths",
      "avgDailyBudget",
      "guideChunks",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: { bsonType: "objectId" },
      slug: { bsonType: "string" },
      name: { bsonType: "string" },
      country: { bsonType: "string" },
      region: { bsonType: "string" },
      summary: { bsonType: "string" },
      tags: { bsonType: "array", items: { bsonType: "string" } },
      bestMonths: { bsonType: "array", items: { bsonType: "number" } },
      avgDailyBudget: {
        bsonType: "object",
        required: ["low", "mid", "high", "currency"],
        properties: {
          low: { bsonType: "number" },
          mid: { bsonType: "number" },
          high: { bsonType: "number" },
          currency: { bsonType: "string" },
        },
      },
      guideChunks: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["id", "text", "topic"],
          properties: {
            id: { bsonType: "string" },
            text: { bsonType: "string" },
            topic: { bsonType: "string" },
            embedding: {
              bsonType: "array",
              items: { bsonType: "number" },
            },
          },
        },
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

const tripsValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "_id",
      "ownerId",
      "title",
      "brief",
      "destinationIds",
      "status",
      "share",
      "chatHistory",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: { bsonType: "objectId" },
      ownerId: { bsonType: "string" },
      title: { bsonType: "string" },
      brief: {
        bsonType: "object",
        required: [
          "cities",
          "startDate",
          "endDate",
          "interests",
          "budget",
        ],
        properties: {
          cities: { bsonType: "array", items: { bsonType: "string" } },
          startDate: { bsonType: "date" },
          endDate: { bsonType: "date" },
          interests: { bsonType: "array", items: { bsonType: "string" } },
          budget: { enum: ["low", "mid", "high"] },
          notes: { bsonType: "string" },
        },
      },
      destinationIds: {
        bsonType: "array",
        items: { bsonType: "objectId" },
      },
      status: { enum: ["draft", "generated", "archived"] },
      share: {
        bsonType: "object",
        required: ["enabled"],
        properties: {
          enabled: { bsonType: "bool" },
          slug: { bsonType: "string" },
        },
      },
      chatHistory: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["role", "content", "createdAt"],
          properties: {
            role: { enum: ["user", "assistant"] },
            content: { bsonType: "string" },
            createdAt: { bsonType: "date" },
          },
        },
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

// A trip can have many days and chat edits one day at a time; separate, small
// day documents avoid rewriting one large trip document for every edit.
const itineraryDaysValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "_id",
      "tripId",
      "ownerId",
      "dayNumber",
      "date",
      "destinationId",
      "title",
      "items",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: { bsonType: "objectId" },
      tripId: { bsonType: "objectId" },
      ownerId: { bsonType: "string" },
      dayNumber: { bsonType: "number" },
      date: { bsonType: "date" },
      destinationId: { bsonType: "objectId" },
      title: { bsonType: "string" },
      items: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["name", "description", "category", "sourceChunkIds"],
          properties: {
            time: { bsonType: "string" },
            name: { bsonType: "string" },
            description: { bsonType: "string" },
            category: {
              enum: ["food", "sight", "activity", "transport", "rest"],
            },
            durationMinutes: { bsonType: "number" },
            sourceChunkIds: {
              bsonType: "array",
              items: { bsonType: "string" },
            },
          },
        },
      },
      notes: { bsonType: "string" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

const collectionDefinitions = [
  { name: "destinations", validator: destinationsValidator },
  { name: "trips", validator: tripsValidator },
  { name: "itineraryDays", validator: itineraryDaysValidator },
] as const satisfies ReadonlyArray<{
  name: string;
  validator: Document;
}>;

const indexDefinitions = [
  {
    collection: "destinations",
    name: "slug_unique",
    key: { slug: 1 },
    options: { unique: true },
  },
  {
    collection: "destinations",
    name: "tags",
    key: { tags: 1 },
    options: {},
  },
  {
    collection: "trips",
    name: "ownerId_updatedAt",
    key: { ownerId: 1, updatedAt: -1 },
    options: {},
  },
  {
    collection: "trips",
    name: "share_slug_unique_sparse",
    key: { "share.slug": 1 },
    options: { unique: true, sparse: true },
  },
  {
    collection: "itineraryDays",
    name: "tripId_dayNumber_unique",
    key: { tripId: 1, dayNumber: 1 },
    options: { unique: true },
  },
  {
    collection: "itineraryDays",
    name: "ownerId",
    key: { ownerId: 1 },
    options: {},
  },
] as const;

export interface SetupSummary {
  collectionsCreated: string[];
  indexesCreated: string[];
}

export async function ensureCollections(db?: Db): Promise<SetupSummary> {
  const database = db ?? (await getDb());
  const existingCollections = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );
  const collectionsCreated: string[] = [];

  for (const { name, validator } of collectionDefinitions) {
    if (existingCollections.has(name)) {
      await database.command({
        collMod: name,
        validator,
        validationLevel: "moderate",
      });
      continue;
    }

    await database.createCollection(name, {
      validator,
      validationLevel: "moderate",
    });
    collectionsCreated.push(name);
  }

  const indexesCreated: string[] = [];

  for (const index of indexDefinitions) {
    const collection = database.collection(index.collection);
    const existingIndexes = await collection.listIndexes().toArray();
    const existed = existingIndexes.some(
      (existingIndex) => existingIndex.name === index.name,
    );
    await collection.createIndex(index.key, {
      ...index.options,
      name: index.name,
    });
    if (!existed) {
      indexesCreated.push(`${index.collection}.${index.name}`);
    }
  }

  return { collectionsCreated, indexesCreated };
}
