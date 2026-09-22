import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createAlert, listActiveAlerts, deleteAlert } from "../services/weatherAlertService";

// Perfis autorizados a publicar alertas: governo, ONGs e admin
const ALLOWED_ROLES = ["ADMIN", "GOVERNO", "ONG"];

export async function create(req: AuthRequest, res: Response) {
  try {
    if (!ALLOWED_ROLES.includes(req.userRole ?? "")) {
      return res.status(403).json({ error: "Só governo, ONGs e administradores podem publicar alertas." });
    }

    const { region, type, severity, title, description, expiresAt } = req.body;

    if (!region || !type || !severity || !title || !description) {
      return res.status(400).json({
        error: "Preencha região, tipo, gravidade, título e descrição.",
      });
    }

    const alert = await createAlert({
      createdById: req.userId!,
      region,
      type,
      severity,
      title,
      description,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return res.status(201).json(alert);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: Request, res: Response) {
  try {
    const region = req.query.region as string | undefined;
    const alerts = await listActiveAlerts(region);
    return res.status(200).json(alerts);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    if (!ALLOWED_ROLES.includes(req.userRole ?? "")) {
      return res.status(403).json({ error: "Só governo, ONGs e administradores podem remover alertas." });
    }

    await deleteAlert(req.params.id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
