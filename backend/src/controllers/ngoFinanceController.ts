import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listFunding,
  createFunding,
  updateFunding,
  deleteFunding,
  listExpenses,
  createExpense,
  deleteExpense,
  financeReport,
} from "../services/ngoFinanceService";
import {
  listPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getPartner,
  projectPartners,
  linkPartner,
  unlinkPartner,
} from "../services/ngoPartnerService";

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

// ---------- Financiamento ----------
export function funding(req: AuthRequest, res: Response) {
  return run(res, () =>
    listFunding(req.userId!, req.userRole, {
      status: str(req.query.status),
      projectId: str(req.query.projectId),
      kind: str(req.query.kind),
    })
  );
}

export function newFunding(req: AuthRequest, res: Response) {
  return run(res, () => createFunding(req.userId!, req.userRole, req.body), 201);
}

export function editFunding(req: AuthRequest, res: Response) {
  return run(res, () => updateFunding(req.userId!, req.userRole, req.params.id, req.body));
}

export function removeFunding(req: AuthRequest, res: Response) {
  return run(res, () => deleteFunding(req.userId!, req.userRole, req.params.id));
}

// ---------- Despesas ----------
export function expenses(req: AuthRequest, res: Response) {
  return run(res, () =>
    listExpenses(req.userId!, req.userRole, {
      projectId: str(req.query.projectId),
      category: str(req.query.category),
      from: str(req.query.from),
      to: str(req.query.to),
    })
  );
}

export function newExpense(req: AuthRequest, res: Response) {
  return run(res, () => createExpense(req.userId!, req.userRole, req.body), 201);
}

export function removeExpense(req: AuthRequest, res: Response) {
  return run(res, () => deleteExpense(req.userId!, req.userRole, req.params.id));
}

export function report(req: AuthRequest, res: Response) {
  return run(res, () =>
    financeReport(req.userId!, req.userRole, {
      projectId: str(req.query.projectId),
      from: str(req.query.from),
      to: str(req.query.to),
    })
  );
}

// ---------- Parceiros ----------
export function partners(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPartners(req.userId!, req.userRole, {
      type: str(req.query.type),
      status: str(req.query.status),
      q: str(req.query.q),
    })
  );
}

export function partner(req: AuthRequest, res: Response) {
  return run(res, () => getPartner(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function newPartner(req: AuthRequest, res: Response) {
  return run(res, () => createPartner(req.userId!, req.userRole, req.body), 201);
}

export function editPartner(req: AuthRequest, res: Response) {
  return run(res, () => updatePartner(req.userId!, req.userRole, req.params.id, req.body));
}

export function removePartner(req: AuthRequest, res: Response) {
  return run(res, () => deletePartner(req.userId!, req.userRole, req.params.id));
}

export function partnersOfProject(req: AuthRequest, res: Response) {
  return run(res, () => projectPartners(req.userId!, req.userRole, req.params.id));
}

export function link(req: AuthRequest, res: Response) {
  return run(res, () => linkPartner(req.userId!, req.userRole, req.params.id, req.body), 201);
}

export function unlink(req: AuthRequest, res: Response) {
  return run(res, () => unlinkPartner(req.userId!, req.userRole, req.params.id, req.params.partnerId));
}
