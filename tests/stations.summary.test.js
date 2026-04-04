/**
 * Integration tests: GET /stations/:station_id/summary correctness.
 *
 * Requirement: “Summary endpoint correctness per station.”
 *
 * - events_count = all stored events for that station (every status).
 * - total_approved_amount = sum of amount only where status === "approved".
 * - Station with no rows still returns 200 with zeros (per store query semantics).
 *
 * Data is seeded via POST /transfers (same path as production).
 *
 * Prerequisites: Postgres, transfers table, DB_* env.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import pg from "pg";
import "dotenv/config";
import { createApp } from "../src/app.js";

const { Pool } = pg;

const CREATED = "2026-02-19T16:00:00.000Z";

describe("GET /stations/:station_id/summary", () => {
  let pool;
  let app;

  beforeAll(() => {
    pool = new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "postgres",
      database: process.env.DB_NAME ?? "station_transfers",
    });
    app = createApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE transfers RESTART IDENTITY");
  });

  it(
    "counts all events per station and sums only approved amounts",
    async () => {
      await request(app)
        .post("/transfers")
        .send({
          events: [
            {
              event_id: "c0000000-0000-4000-8000-000000000001",
              station_id: "STN-SUM-A",
              amount: 100,
              status: "approved",
              created_at: CREATED,
            },
            {
              event_id: "c0000000-0000-4000-8000-000000000002",
              station_id: "STN-SUM-A",
              amount: 50,
              status: "approved",
              created_at: CREATED,
            },
            {
              event_id: "c0000000-0000-4000-8000-000000000003",
              station_id: "STN-SUM-A",
              amount: 30,
              status: "pending",
              created_at: CREATED,
            },
            {
              event_id: "c0000000-0000-4000-8000-000000000004",
              station_id: "STN-SUM-B",
              amount: 25,
              status: "approved",
              created_at: CREATED,
            },
            {
              event_id: "c0000000-0000-4000-8000-000000000005",
              station_id: "STN-SUM-B",
              amount: 1000,
              status: "rejected",
              created_at: CREATED,
            },
          ],
        })
        .expect(201);

      const resA = await request(app).get("/stations/STN-SUM-A/summary").expect(200);
      expect(resA.body).toEqual({
        station_id: "STN-SUM-A",
        events_count: 3,
        total_approved_amount: 150,
      });

      const resB = await request(app).get("/stations/STN-SUM-B/summary").expect(200);
      expect(resB.body).toEqual({
        station_id: "STN-SUM-B",
        events_count: 2,
        total_approved_amount: 25,
      });
    },
    15_000
  );

  it(
    "returns zeros for a station with no events",
    async () => {
      const res = await request(app).get("/stations/STN-EMPTY/summary").expect(200);
      expect(res.body).toEqual({
        station_id: "STN-EMPTY",
        events_count: 0,
        total_approved_amount: 0,
      });
    },
    15_000
  );
});
