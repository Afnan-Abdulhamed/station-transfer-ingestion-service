/**
 * Integration tests: POST /transfers validation (fail-fast) and 400 responses.
 *
 *
 * Zod validates the whole body; any failure rejects the entire batch with 400
 * and { error, details } (Zod flatten). No rows are written when validation fails.
 *
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import pg from "pg";
import "dotenv/config";
import { createApp } from "../src/app.js";

const { Pool } = pg;

const VALID = {
  event_id: "d0000000-0000-4000-8000-000000000001",
  station_id: "STN-VAL",
  amount: 1,
  status: "approved",
  created_at: "2026-02-19T17:00:00.000Z",
};

describe("POST /transfers validation (fail-fast)", () => {
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

  async function rowCount() {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM transfers");
    return rows[0].c;
  }

  it(
    "400 when events is missing or empty",
    async () => {
      let res = await request(app).post("/transfers").send({}).expect(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toBeDefined();
      expect(await rowCount()).toBe(0);

      res = await request(app).post("/transfers").send({ events: [] }).expect(400);
      expect(res.body.error).toBe("Validation failed");
      expect(await rowCount()).toBe(0);
    },
    15_000
  );

  it(
    "400 for invalid event_id and does not insert",
    async () => {
      const res = await request(app)
        .post("/transfers")
        .send({
          events: [{ ...VALID, event_id: "not-a-uuid" }],
        })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toBeDefined();
      expect(await rowCount()).toBe(0);
    },
    15_000
  );

  it(
    "400 for negative amount",
    async () => {
      const res = await request(app)
        .post("/transfers")
        .send({
          events: [{ ...VALID, amount: -1 }],
        })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
      expect(await rowCount()).toBe(0);
    },
    15_000
  );

  it(
    "fail-fast: one invalid event rejects the whole batch and inserts nothing",
    async () => {
      const res = await request(app)
        .post("/transfers")
        .send({
          events: [
            VALID,
            {
              ...VALID,
              event_id: "d0000000-0000-4000-8000-000000000002",
              amount: "10",
            },
          ],
        })
        .expect(400);

      expect(res.body.error).toBe("Validation failed");
      expect(await rowCount()).toBe(0);
    },
    15_000
  );
});
