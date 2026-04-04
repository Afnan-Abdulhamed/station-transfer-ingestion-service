import { transfersIngestionSchema } from "../validation/eventIngestionSchema.js";


export class TransferIngestService {
  constructor(store) {
    this._store = store;
  }

  /**
   * Ingest the transfers 
   * 
   * @param {unknown} body Raw JSON body from POST /transfers
   * @returns {Promise<import("../store/baseStore.js").IngestResult>}
   */
  async ingest(body) {
    // Validate the transfers ingestion schema ( body)
    const parsed = transfersIngestionSchema.safeParse(body);
    
    if (!parsed.success) {
      const err = new Error("Validation failed");
      err.statusCode = 400;
      err.details = parsed.error.flatten();
      throw err;
    }
    return this._store.ingestEvents(parsed.data.events);
  }
}
