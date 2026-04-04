/**
 * Station reconciliation summary (counts + approved totals).
 *
 * @param {import("../store/baseStore.js").BaseStore} store
 */
export class StationSummaryService {
  constructor(store) {
    this._store = store;
  }

  /**
   * @param {string | undefined} stationId From route param
   * @returns {Promise<import("../store/baseStore.js").StationSummary>}
   */
  async getSummary(stationId) {
    const id = typeof stationId === "string" ? stationId.trim() : "";
    if (!id) {
      const err = new Error("station_id is required");
      err.statusCode = 400;
      throw err;
    }
    return this._store.getStationSummary(id);
  }
}
