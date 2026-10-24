import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { agentFinanceCatalog } from "../lib/agentFinanceCatalog";
import {
  getEarnings,
  listCommissions,
  listPayments,
  getReport,
  adminCommissionsOverview,
  adminListCommissions,
  adminMarkPaid,
  adminVoidCommission,
  adminReconcile,
} from "../services/agentEarningsService";
import { getAgentMap } from "../services/agentMapService";
import {
  getSecurity,
  lockAccount,
  createSecurityReport,
  listMySecurityReports,
  adminUnlock,
  adminAgentDetail,
  adminSignals,
  adminListSecurityReports,
  adminRespondSecurityReport,
} from "../services/agentSecurityService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

export function financeCatalog(req: AuthRequest, res: Response) {
  return res.status(200).json(agentFinanceCatalog());
}

// ---------- Ganhos ----------
export function earnings(req: AuthRequest, res: Response) {
  return run(res, () => getEarnings(req.userId!, req.userRole));
}

export function commissions(req: AuthRequest, res: Response) {
  return run(res, () =>
    listCommissions(req.userId!, req.userRole, {
      status: str(req.query.status),
      reason: str(req.query.reason),
      from: str(req.query.from),
      to: str(req.query.to),
      page: num(req.query.page),
    })
  );
}

export function payments(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPayments(req.userId!, req.userRole, { status: str(req.query.status), linkId: str(req.query.linkId), page: num(req.query.page) })
  );
}

export function report(req: AuthRequest, res: Response) {
  return run(res, () => getReport(req.userId!, req.userRole, { from: str(req.query.from), to: str(req.query.to) }));
}

// ---------- Mapa ----------
export function map(req: AuthRequest, res: Response) {
  return run(res, () => getAgentMap(req.userId!, req.userRole, { layers: str(req.query.layers) }));
}

// ---------- Segurança ----------
export function security(req: AuthRequest, res: Response) {
  return run(res, () => getSecurity(req.userId!, req.userRole));
}

export function lock(req: AuthRequest, res: Response) {
  return run(res, () => lockAccount(req.userId!, req.userRole, req.body?.reason));
}

export function securityReportCreate(req: AuthRequest, res: Response) {
  return run(res, () => createSecurityReport(req.userId!, req.userRole, req.body), 201);
}

export function securityReportMine(req: AuthRequest, res: Response) {
  return run(res, () => listMySecurityReports(req.userId!));
}

// ---------- Equipa do app ----------
export function adminCommissions(req: AuthRequest, res: Response) {
  return run(res, () => adminCommissionsOverview(req.userRole, { q: str(req.query.q) }));
}

export function adminCommissionList(req: AuthRequest, res: Response) {
  return run(res, () =>
    adminListCommissions(req.userRole, { agentId: str(req.query.agentId), status: str(req.query.status), page: num(req.query.page) })
  );
}

export function adminPay(req: AuthRequest, res: Response) {
  return run(res, () => adminMarkPaid(req.userRole, req.userId!, req.body));
}

export function adminVoid(req: AuthRequest, res: Response) {
  return run(res, () => adminVoidCommission(req.userRole, req.userId!, req.params.id, req.body?.note));
}

export function adminReconcileAgent(req: AuthRequest, res: Response) {
  return run(res, () => adminReconcile(req.userRole, req.params.userId));
}

export function adminUnlockAgent(req: AuthRequest, res: Response) {
  return run(res, () => adminUnlock(req.userRole, req.userId!, req.params.userId, req.body?.note));
}

export function adminDetail(req: AuthRequest, res: Response) {
  return run(res, () => adminAgentDetail(req.userRole, req.params.userId), 200, 404);
}

export function adminSignalList(req: AuthRequest, res: Response) {
  return run(res, () => adminSignals(req.userRole));
}

export function adminSecurityReports(req: AuthRequest, res: Response) {
  return run(res, () => adminListSecurityReports(req.userRole, { status: str(req.query.status), q: str(req.query.q) }));
}

export function adminSecurityRespond(req: AuthRequest, res: Response) {
  return run(res, () => adminRespondSecurityReport(req.userRole, req.userId!, req.params.id, req.body));
}
