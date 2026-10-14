import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getForecast, listRegions } from "../services/weatherService";

export async function forecast(req: AuthRequest, res: Response) {
  try {
    const region = typeof req.query.region === "string" && req.query.region.trim() ? req.query.region.trim() : undefined;
    return res.status(200).json(await getForecast(req.userId!, region));
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function regions(req: AuthRequest, res: Response) {
  return res.status(200).json(listRegions());
}
