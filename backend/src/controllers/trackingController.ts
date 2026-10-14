import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { setLocation, getTracking, nearbyTransporters } from "../services/trackingService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

export function location(req: AuthRequest, res: Response) {
  return run(res, () => setLocation(req.params.id, req.userId!, req.body));
}

export function tracking(req: AuthRequest, res: Response) {
  return run(res, () => getTracking(req.params.id, req.userId!), 200, 404);
}

export function transporters(req: AuthRequest, res: Response) {
  const near = typeof req.query.near === "string" ? req.query.near : undefined;
  return run(res, () => nearbyTransporters(near));
}
