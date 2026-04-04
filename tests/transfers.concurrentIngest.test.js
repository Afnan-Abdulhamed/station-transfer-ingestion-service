/**
 * Integration tests: concurrent POST /transfers with the same event_id must not double-insert.
 * *
 * Two requests are fired in parallel (Promise.all) with identical bodies. Exactly one row
 * should exist for that event_id; combined inserted/duplicates across responses should
 * reflect one insert and one skip; station summary must match a single successful ingest.
 * */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import pg from "pg";
import "dotenv/config";
import { createApp } from "../src/app.js";

const { Pool } = pg;

const EVENT = {
  event_id: "b0000000-0000-4000-8000-000000000001",
  station_id: "STN-CONC",
  amount: 77.5,
  status: "approved",
  created_at: "2026-02-19T15:00:00.000Z",
};

describe("Concurrent ingest of the same event_id", () => {
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
    "parallel duplicate POSTs yield one row and correct summary",
    async () => {
      const body = { events: [EVENT] };

      const [resA, resB] = await Promise.all([
        request(app).post("/transfers").send(body),
        request(app).post("/transfers").send(body),
      ]);

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);

      const inserted = resA.body.inserted + resB.body.inserted;
      const duplicates = resA.body.duplicates + resB.body.duplicates;
      expect(inserted).toBe(1);
      expect(duplicates).toBe(1);

      const { rows } = await pool.query(
        "SELECT COUNT(*)::int AS c FROM transfers WHERE event_id = $1",
        [EVENT.event_id]
      );
      expect(rows[0].c).toBe(1);

      const sum = await request(app).get("/stations/STN-CONC/summary").expect(200);
      expect(sum.body).toMatchObject({
        station_id: "STN-CONC",
        events_count: 1,
        total_approved_amount: 77.5,
      });
    },
    15_000
  );
});
