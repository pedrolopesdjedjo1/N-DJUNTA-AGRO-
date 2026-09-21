import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createReport, listReports, updateReportStatus } from "../services/reportService";

export async function create(req: AuthRequest, res: Response) {
  try {
    const { targetType, targetId, reason } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        error: "Informe o tipo (USER ou PRODUCT), o alvo e o motivo da denúncia.",
      });
    }

    const report = await createReport({
      reporterId: req.userId!,
      targetType,
      targetId,
      reason,
    });

    return res.status(201).json(report);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin
export async function list(req: AuthRequest, res: Response) {
  try {
    const status = req.query.status as any;
    const reports = await listReports(status);
    return res.status(200).json(reports);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// Rota restrita ao admin
export async function updateStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Informe o novo status da denúncia." });
    }

    const report = await updateReportStatus(req.params.id, status);
    return res.status(200).json(report);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
