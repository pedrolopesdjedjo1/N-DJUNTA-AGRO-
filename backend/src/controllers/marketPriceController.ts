import { Request, Response } from "express";
import {
  getAveragePriceByCategory,
  getAveragePriceByCategoryAndLocation,
} from "../services/marketPriceService";

export async function byCategory(_req: Request, res: Response) {
  try {
    const data = await getAveragePriceByCategory();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function byCategoryAndLocation(req: Request, res: Response) {
  try {
    const { category } = req.params;
    const data = await getAveragePriceByCategoryAndLocation(category as any);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
