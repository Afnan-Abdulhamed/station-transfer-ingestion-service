export class StationSummaryController {
  /** @param {import("../services/stationSummaryService.js").StationSummaryService} service */
  constructor(service) {
    this.service = service;
  }

  getSummary = async (req, res, next) => {
    try {
      const summary = await this.service.getSummary(req.params.station_id);
      res.status(200).json(summary);
    } catch (err) {
      if (err.statusCode === 400) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  };
}
