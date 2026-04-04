/**
 * Integration tests: ingest order of batches does not change reconciliation totals.
 *
 * Requirement: “Out-of-order arrival still produces same totals.”
 *
 * We use two disjoint POST /transfers batches (A and B) that reference the same
 * station. Ingesting A then B vs B then A must yield the same GET summary:
 * events_count counts all stored rows; total_approved_amount sums only approved.
 *
 * Event IDs are fixed UUIDs so the same logical events are sent in both scenarios.
 * */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import pg from "pg";
import "dotenv/config";
import { createApp } from "../src/app.js";

const { Pool } = pg;

const CREATED = "2026-02-19T12:00:00.000Z";

/** Fixed ids so batch A vs B order can be swapped without changing the final multiset of events. */
const batchA = {
  events: [
    {
      event_id: "a0000000-0000-4000-8000-000000000001",
      station_id: "STN-OO",
      amount: 100,
      status: "approved",
      created_at: CREATED,
    },
    {
      event_id: "a0000000-0000-4000-8000-000000000002",
      station_id: "STN-OO",
      amount: 50,
      status: "approved",
      created_at: CREATED,
    },
  ],
};

const batchB = {
  events: [
    {
      event_id: "a0000000-0000-4000-8000-000000000003",
      station_id: "STN-OO",
      amount: 999,
      status: "pending",
      created_at: CREATED,
    },
  ],
};

async function summary(app) {
  const res = await request(app).get("/stations/STN-OO/summary").expect(200);
  return res.body;
}

describe("Out-of-order batch arrival produces the same station totals", () => {
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
    "A then B vs B then A yields identical GET /stations/:station_id/summary",
    async () => {
      await request(app).post("/transfers").send(batchA).expect(201);
      await request(app).post("/transfers").send(batchB).expect(201);
      const firstOrder = await summary(app);

      await pool.query("TRUNCATE transfers RESTART IDENTITY");

      await request(app).post("/transfers").send(batchB).expect(201);
      await request(app).post("/transfers").send(batchA).expect(201);
      const secondOrder = await summary(app);

      expect(secondOrder).toEqual(firstOrder);
      expect(firstOrder).toMatchObject({
        station_id: "STN-OO",
        events_count: 3,
        total_approved_amount: 150,
      });
    },
    15_000
  );
});
