import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { hiddenContent } from "../services/adminOrgService";
import { coopStatusFor } from "../services/adminCoopService";
import { myRefunds } from "../services/adminFinanceService";

async function run(res: Response, work: () => Promise<any>) {
  try {
    return res.status(200).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

// O que a equipa escondeu (publicações, oportunidades, projetos)
export const hidden = (req: AuthRequest, res: Response) => run(res, () => hiddenContent(typeof req.query.kind === "string" ? req.query.kind : undefined));

// O estado de aprovação de uma cooperativa
export const coopStatus = (req: AuthRequest, res: Response) => run(res, () => coopStatusFor(req.params.id));

// Os reembolsos do próprio comprador
export const refundsMine = (req: AuthRequest, res: Response) => run(res, () => myRefunds(req.userId!));
