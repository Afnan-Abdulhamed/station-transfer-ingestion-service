/**
 * Documentation for the transfer event input, ingest result and station summary
 *
 * @typedef {object} TransferEventInput
 * @property {string} event_id
 * @property {string} station_id
 * @property {number} amount
 * @property {string} status
 * @property {string} created_at
 *
 * @typedef {object} IngestResult
 * @property {number} inserted
 * @property {number} duplicates
 *
 * @typedef {object} StationSummary
 * @property {string} station_id
 * @property {number} total_approved_amount
 * @property {number} events_count
 */


export class BaseStore {

  /**
   * Ingest the events
   * 
   * @param {TransferEventInput[]} _events
   * @returns {Promise<IngestResult>}
   */
  async ingestEvents(_events) {
    throw new Error("BaseStore.ingestEvents must be implemented");
  }

  /**
   * Get the station summary
   * 
   * @param {string} stationId
   * @returns {Promise<StationSummary>}
   */
  async getStationSummary(_stationId) {
    throw new Error("BaseStore.getStationSummary must be implemented");
  }
}
