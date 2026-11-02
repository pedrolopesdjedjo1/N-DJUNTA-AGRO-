import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { transportMoneyCatalog } from "../lib/transportMoneyCatalog";
import { listPayouts, confirmPayout, contestPayout, listExpenses, createExpense, updateExpense, deleteExpense } from "../services/transportMoneyService";
import { rateParty, deliveryParties, receivedComplaints } from "../services/transportReputationService";

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

export const moneyCatalog = (req: AuthRequest, res: Response) => res.status(200).json(transportMoneyCatalog());

export const payouts = (req: AuthRequest, res: Response) =>
  run(res, () => listPayouts(req.userId!, req.userRole, { status: str(req.query.status), from: str(req.query.from), to: str(req.query.to), page: num(req.query.page) }));
export const payoutConfirm = (req: AuthRequest, res: Response) => run(res, () => confirmPayout(req.userId!, req.userRole, req.params.id, req.body));
export const payoutContest = (req: AuthRequest, res: Response) => run(res, () => contestPayout(req.userId!, req.userRole, req.params.id, req.body));

export const expenses = (req: AuthRequest, res: Response) =>
  run(res, () => listExpenses(req.userId!, req.userRole, { from: str(req.query.from), to: str(req.query.to), kind: str(req.query.kind), page: num(req.query.page) }));
export const expenseCreate = (req: AuthRequest, res: Response) => run(res, () => createExpense(req.userId!, req.userRole, req.body), 201);
export const expenseUpdate = (req: AuthRequest, res: Response) => run(res, () => updateExpense(req.userId!, req.userRole, req.params.id, req.body));
export const expenseDelete = (req: AuthRequest, res: Response) => run(res, () => deleteExpense(req.userId!, req.userRole, req.params.id));

export const partyRate = (req: AuthRequest, res: Response) => run(res, () => rateParty(req.userId!, req.userRole, req.body));
export const parties = (req: AuthRequest, res: Response) => run(res, () => deliveryParties(req.userId!, req.userRole, req.params.id), 200, 404);
export const complaints = (req: AuthRequest, res: Response) => run(res, () => receivedComplaints(req.userId!, req.userRole));
