/**
 * Integration tests: duplicate ingest must not change reconciliation totals.
 *
 * Requirement: “Duplicate event doesn’t change totals.”
 *
 * Flow:
 * - Ingest an event, read GET /stations/:station_id/summary.
 * - POST the same event_id again (idempotent duplicate).
 * - Summary (events_count, total_approved_amount) must match the first read.
 *
 * Extra case: same event_id with a different amount/status in the body must not
 * overwrite the stored row (ON CONFLICT DO NOTHING), so totals stay aligned with
 * the first successful insert.
 *
 * Prerequisites: Postgres up, transfers table, DB_* env — same as other integration tests.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import pg from "pg";
import "dotenv/config";
import { createApp } from "../src/app.js";

const { Pool } = pg;

function event(overrides = {}) {
  return {
    event_id: randomUUID(),
    station_id: "S1",
    amount: 10,
    status: "approved",
    created_at: "2026-02-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("Duplicate ingest does not change station summary totals", () => {
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
    "re-posting the same payload leaves GET /stations/:station_id/summary unchanged",
    async () => {
      const e = event({
        station_id: "STN-DUP",
        amount: 42.25,
        status: "approved",
      });

      const first = await request(app).post("/transfers").send({ events: [e] }).expect(201);
      expect(first.body).toEqual({ inserted: 1, duplicates: 0 });

      const s1 = await request(app).get("/stations/STN-DUP/summary").expect(200);
      expect(s1.body).toMatchObject({
        station_id: "STN-DUP",
        events_count: 1,
        total_approved_amount: 42.25,
      });

      const dup = await request(app).post("/transfers").send({ events: [e] }).expect(201);
      expect(dup.body).toEqual({ inserted: 0, duplicates: 1 });

      const s2 = await request(app).get("/stations/STN-DUP/summary").expect(200);
      expect(s2.body).toEqual(s1.body);
    },
    15_000
  );

  it(
    "same event_id with different fields does not update stored row or totals",
    async () => {
      const id = randomUUID();
      const original = event({
        event_id: id,
        station_id: "STN-DUP2",
        amount: 10,
        status: "approved",
      });
      await request(app).post("/transfers").send({ events: [original] }).expect(201);

      const s1 = await request(app).get("/stations/STN-DUP2/summary").expect(200);
      expect(s1.body.events_count).toBe(1);
      expect(s1.body.total_approved_amount).toBe(10);

      const conflictingReplay = {
        ...original,
        amount: 999.99,
        status: "pending",
      };
      const dup = await request(app)
        .post("/transfers")
        .send({ events: [conflictingReplay] })
        .expect(201);
      expect(dup.body).toEqual({ inserted: 0, duplicates: 1 });

      const s2 = await request(app).get("/stations/STN-DUP2/summary").expect(200);
      expect(s2.body).toEqual(s1.body);
    },
    15_000
  );
});
