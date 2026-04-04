import "dotenv/config";
import express from "express";
import pg from "pg";
import { PostgresStore } from "./store/postgresStore.js";
import { TransferIngestService } from "./services/transferIngestService.js";
import { StationSummaryService } from "./services/stationSummaryService.js";
import { mountRoutes } from "./routes.js";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

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

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
