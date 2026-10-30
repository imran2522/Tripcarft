import { z } from "zod";

export const itineraryDayItemSchema = z.strictObject({
  time: z.string().optional(),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["food", "sight", "activity", "transport", "rest"]),
  durationMinutes: z.number().int().positive().optional(),
  sourceChunkIds: z.array(z.string().min(1)).min(1),
});

export const itineraryDayRevisionSchema = z.strictObject({
  title: z.string().min(1),
  items: z.array(itineraryDayItemSchema).min(1),
  notes: z.string().max(4000),
});
