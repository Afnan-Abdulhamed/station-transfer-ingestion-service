import { TransferIngestController } from "./controllers/transferIngestController.js";
import { StationSummaryController } from "./controllers/stationSummaryController.js";

/* Mount the routes
 * @param {import("express").Express} app
 * @param {object} deps
 * @param {import("./services/transferIngestService.js").TransferIngestService} deps.transferIngestService
 * @param {import("./services/stationSummaryService.js").StationSummaryService} deps.stationSummaryService
 */
export function mountRoutes(app, deps) {
  const ingest = new TransferIngestController(deps.transferIngestService);
  const summary = new StationSummaryController(deps.stationSummaryService);

  app.post("/transfers", ingest.ingest);
  app.get("/stations/:station_id/summary", summary.getSummary);
}
