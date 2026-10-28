import { Response } from "express";
import { AdminRequest } from "../middleware/adminGuard";
import { adminFinanceCatalog } from "../lib/adminFinanceCatalog";
import * as finance from "../services/adminFinanceService";

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

export const financeCatalog = (req: AdminRequest, res: Response) => res.status(200).json(adminFinanceCatalog());
export const overview = (req: AdminRequest, res: Response) => run(res, () => finance.financeOverview());
export const sales = (req: AdminRequest, res: Response) => run(res, () => finance.salesReport({ from: str(req.query.from), to: str(req.query.to) }));

export const payments = (req: AdminRequest, res: Response) =>
  run(res, () =>
    finance.listPayments({
      state: str(req.query.state),
      method: str(req.query.method),
      from: str(req.query.from),
      to: str(req.query.to),
      q: str(req.query.q),
      sort: str(req.query.sort),
      page: num(req.query.page),
    })
  );

export const transactions = (req: AdminRequest, res: Response) =>
  run(res, () => finance.listTransactions({ kind: str(req.query.kind), from: str(req.query.from), to: str(req.query.to), q: str(req.query.q), page: num(req.query.page) }));

export const commissions = (req: AdminRequest, res: Response) => run(res, () => finance.commissionsOverview({ q: str(req.query.q) }));
export const commissionRows = (req: AdminRequest, res: Response) => run(res, () => finance.commissionRows(req.params.agentId));
export const commissionsPay = (req: AdminRequest, res: Response) => run(res, () => finance.payAgentCommissions(req.admin!, String(req.body?.agentId ?? ""), req.body?.note));
export const commissionVoid = (req: AdminRequest, res: Response) => run(res, () => finance.voidCommission(req.admin!, req.params.id, req.body?.note));

export const refunds = (req: AdminRequest, res: Response) => run(res, () => finance.listRefunds({ status: str(req.query.status), page: num(req.query.page) }));
export const refundCandidates = (req: AdminRequest, res: Response) => run(res, () => finance.refundCandidates());
export const refundOne = (req: AdminRequest, res: Response) => run(res, () => finance.getRefund(req.params.id), 200, 404);
export const refundCreate = (req: AdminRequest, res: Response) => run(res, () => finance.createRefund(req.admin!, req.body), 201);
export const refundDecide = (req: AdminRequest, res: Response) => run(res, () => finance.decideRefund(req.admin!, req.params.id, req.body));
export const refundPay = (req: AdminRequest, res: Response) => run(res, () => finance.payRefund(req.admin!, req.params.id, req.body?.note));

export const flags = (req: AdminRequest, res: Response) => run(res, () => finance.listFlags({ rule: str(req.query.rule), showReviewed: str(req.query.showReviewed), page: num(req.query.page) }));
export const flagReview = (req: AdminRequest, res: Response) => run(res, () => finance.reviewFlag(req.admin!, req.body));

export const report = (req: AdminRequest, res: Response) => run(res, () => finance.financialReport({ from: str(req.query.from), to: str(req.query.to) }));
