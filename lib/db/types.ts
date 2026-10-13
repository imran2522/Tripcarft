import type { Document, ObjectId } from "mongodb";

export interface GuideChunk {
  id: string;
  text: string;
  topic: string;
  embedding?: number[];
}

export interface Destination extends Document {
  _id: ObjectId;
  slug: string;
  name: string;
  country: string;
  region: string;
  summary: string;
  tags: string[];
  bestMonths: number[];
  avgDailyBudget: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  guideChunks: GuideChunk[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Trip extends Document {
  _id: ObjectId;
  ownerId: string;
  title: string;
  brief: {
    cities: string[];
    startDate: Date;
    endDate: Date;
    interests: string[];
    budget: "low" | "mid" | "high";
    notes?: string;
  };
  destinationIds: ObjectId[];
  status: "draft" | "generated" | "archived";
  share: {
    enabled: boolean;
    slug?: string;
  };
  chatHistory: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryDayItem {
  time?: string;
  name: string;
  description: string;
  category: "food" | "sight" | "activity" | "transport" | "rest";
  durationMinutes?: number;
  sourceChunkIds: string[];
}

export interface ItineraryDay extends Document {
  _id: ObjectId;
  tripId: ObjectId;
  ownerId: string;
  dayNumber: number;
  date: Date;
  destinationId: ObjectId;
  title: string;
  items: ItineraryDayItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
