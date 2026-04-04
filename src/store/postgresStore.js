import { BaseStore } from "./baseStore.js";

const INSERT_BATCH = `
  INSERT INTO transfers (event_id, station_id, amount, status, created_at)
  SELECT *
  FROM unnest(
    $1::uuid[],
    $2::text[],
    $3::numeric[],
    $4::text[],
    $5::timestamptz[]
  ) AS t(event_id, station_id, amount, status, created_at)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id
`;

const SUMMARY_FOR_STATION = `
  SELECT
    COUNT(*)::int AS events_count,
    COALESCE(
      SUM(amount) FILTER (WHERE status = 'approved'),
      0
    ) AS total_approved_amount
  FROM transfers
  WHERE station_id = $1
`;

export class PostgresStore extends BaseStore {
  constructor(pool) {
    super();
    this._pool = pool;
  }

  /**
   * @param {import("./baseStore.js").TransferEventInput[]} events
   * @returns {Promise<import("./baseStore.js").IngestResult>}
   */
  async ingestEvents(events) {
    const n = events.length;
    if (n === 0) {
      return { inserted: 0, duplicates: 0 };
    }

    const eventIds = events.map((e) => e.event_id);
    const stationIds = events.map((e) => e.station_id);
    const amounts = events.map((e) => e.amount);
    const statuses = events.map((e) => e.status);
    const createdAts = events.map((e) => new Date(e.created_at));

    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");
      const { rowCount } = await client.query(INSERT_BATCH, [
        eventIds,
        stationIds,
        amounts,
        statuses,
        createdAts,
      ]);
      await client.query("COMMIT");
      const inserted = rowCount ?? 0;
      return { inserted, duplicates: n - inserted };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }



  /**
   * Get the station summary
   * 
   * @param {string} stationId
   * @returns {Promise<import("./baseStore.js").StationSummary>}
   */
  async getStationSummary(stationId) {
    const { rows } = await this._pool.query(SUMMARY_FOR_STATION, [stationId]);
    const row = rows[0];
    return {
      station_id: stationId,
      events_count: row.events_count,
      total_approved_amount: Number(row.total_approved_amount),
    };
  }
}
