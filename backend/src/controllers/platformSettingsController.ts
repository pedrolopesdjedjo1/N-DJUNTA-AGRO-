import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getSettings, updateCommission } from "../services/platformSettingsService";

export async function get(_req: AuthRequest, res: Response) {
  try {
    const settings = await getSettings();
    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin
export async function update(req: AuthRequest, res: Response) {
  try {
    const { commissionPercentage } = req.body;

    if (commissionPercentage === undefined) {
      return res.status(400).json({ error: "Informe a nova porcentagem de comissão." });
    }

    const settings = await updateCommission(commissionPercentage);
    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
