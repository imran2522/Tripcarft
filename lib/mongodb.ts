import "server-only";

import { MongoClient, type Collection, type Db } from "mongodb";
import type { Destination, ItineraryDay, Trip } from "@/lib/db/types";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is missing. Add your MongoDB Atlas connection string to the environment.",
  );
}

const databaseName = process.env.MONGODB_DB ?? "tripcraft";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export const clientPromise =
  process.env.NODE_ENV === "development"
    ? (globalThis._mongoClientPromise ??= new MongoClient(uri).connect())
    : new MongoClient(uri).connect();

export async function getDb(): Promise<Db> {
  return (await clientPromise).db(databaseName);
}

export async function getTrips(): Promise<Collection<Trip>> {
  return (await getDb()).collection<Trip>("trips");
}

export async function getDestinations(): Promise<Collection<Destination>> {
  return (await getDb()).collection<Destination>("destinations");
}

export async function getItineraryDays(): Promise<Collection<ItineraryDay>> {
  return (await getDb()).collection<ItineraryDay>("itineraryDays");
}
