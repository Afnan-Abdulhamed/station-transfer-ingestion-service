import express from "express";
import { PostgresStore } from "./store/postgresStore.js";
import { TransferIngestService } from "./services/transferIngestService.js";
import { StationSummaryService } from "./services/stationSummaryService.js";
import { mountRoutes } from "./routes.js";

/**
 * HTTP application factory (Express app only).
 */
/**
 * Wires store, services, routes, and the global error handler into one Express instance.
 *
 * @param {import("pg").Pool} pool
 * @returns {import("express").Express}
 */
export function createApp(pool) {
  const store = new PostgresStore(pool);
  const transferIngestService = new TransferIngestService(store);
  const stationSummaryService = new StationSummaryService(store);

  const app = express();
  app.use(express.json());
  mountRoutes(app, { transferIngestService, stationSummaryService });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
