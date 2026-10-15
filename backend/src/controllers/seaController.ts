import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getConditions, getZones } from "../services/seaService";

export async function conditions(req: AuthRequest, res: Response) {
  try {
    const zone = typeof req.query.zone === "string" && req.query.zone.trim() ? req.query.zone.trim() : undefined;
    return res.status(200).json(await getConditions(req.userId!, zone));
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function zones(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getZones());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
