import { z } from "zod";

// Validate the transfer event schema
export const transferEventSchema = z.object({
  event_id: z.string().uuid({ message: "Invalid UUID format" }),
  station_id: z.string().min(1, "Station ID is required"), // avoid empty
  amount: z.number().finite().nonnegative(), //prevents "Infinity" or "NaN"
  status: z.string().min(1),
  created_at: z.string().datetime({ message: "Invalid ISO 8601 date-time" }),
});

// Validate the transfers ingestion schema and it must have at least one event
export const transfersIngestionSchema = z.object({
  events: z.array(transferEventSchema).min(1, "At least one event is required"),
});
