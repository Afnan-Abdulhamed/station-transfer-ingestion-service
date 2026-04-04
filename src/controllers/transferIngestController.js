
export class TransferIngestController {
  
  constructor(service) {
    this.service = service;
  }

  /**
   * Ingest the transfers
   * 
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @param {import("express").NextFunction} next
   */
  ingest = async (req, res, next) => {
    try {
      const result = await this.service.ingest(req.body);
      
      res.status(201).json(result);
    } catch (err) {
      if (err.statusCode === 400) {
        return res.status(400).json({
          error: err.message,
          details: err.details,
        });
      }
      next(err);
    }
  };
}
