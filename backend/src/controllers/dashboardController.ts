import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getOverview, getUserGrowth } from "../services/dashboardService";

// Perfis autorizados a ver o dashboard: administrador, governo e ONGs
const ALLOWED_ROLES = ["ADMIN", "GOVERNO", "ONG"];

function checkAccess(req: AuthRequest, res: Response): boolean {
  if (!ALLOWED_ROLES.includes(req.userRole ?? "")) {
    res.status(403).json({ error: "Acesso restrito a governo, ONGs e administradores." });
    return false;
  }
  return true;
}

export async function overview(req: AuthRequest, res: Response) {
  if (!checkAccess(req, res)) return;

  try {
    const data = await getOverview();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function growth(req: AuthRequest, res: Response) {
  if (!checkAccess(req, res)) return;

  try {
    const data = await getUserGrowth();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
