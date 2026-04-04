/**
 * Integration tests: POST /transfers response shape { inserted, duplicates }.
 *
 * What this file checks (“batch insert counts” requirement):
 * - First-time event_ids are counted as inserts; repeats in the same or a later
 *   batch are counted as duplicates (idempotency via ON CONFLICT DO NOTHING).
 * - A single request can mix new and existing ids; inserted + duplicates must
 *   equal the number of events in that request body.
 *
 * How it runs:
 * - Uses Supertest against createApp(pool) — no listen(); see src/app.js.
 *
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import pg from "pg";
import "dotenv/config";
import { createApp } from "../src/app.js";

const { Pool } = pg;

/** Builds one valid transfer event object (UUID + ISO datetime) for request bodies. */
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

describe("POST /transfers — batch insert counts", () => {
  let pool;
  let app;

  // One shared pool + app for the whole file; tests must not rely on shared rows.
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

  // Empty table before each test so counts are predictable.
  beforeEach(async () => {
    await pool.query("TRUNCATE transfers RESTART IDENTITY");
  });

  it(
    "returns inserted and duplicates for an all-new batch",
    async () => {
      // No rows yet → all three event_ids should insert, none skipped.
      const events = [event(), event(), event()];
      const res = await request(app).post("/transfers").send({ events }).expect(201);

      expect(res.body).toEqual({ inserted: 3, duplicates: 0 });
    },
    15_000
  );

  it(
    "returns all duplicates when every event_id already exists",
    async () => {
      const events = [event(), event()];
      await request(app).post("/transfers").send({ events }).expect(201);

      // Same payload again → every row conflicts on event_id → all duplicates.
      const res = await request(app).post("/transfers").send({ events }).expect(201);
      expect(res.body).toEqual({ inserted: 0, duplicates: 2 });
    },
    15_000
  );

  it(
    "returns mixed inserted and duplicates in one batch",
    async () => {
      const existing = event();
      const fresh = event();
      await request(app).post("/transfers").send({ events: [existing] }).expect(201);

      // Batch contains one existing id and one new id → 1 insert, 1 skip.
      const res = await request(app)
        .post("/transfers")
        .send({ events: [existing, fresh] })
        .expect(201);

      expect(res.body).toEqual({ inserted: 1, duplicates: 1 });
    },
    15_000
  );
});
