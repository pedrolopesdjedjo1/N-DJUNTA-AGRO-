import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { transportBusinessCatalog } from "../lib/transportBusinessCatalog";
import * as finance from "../services/transportFinanceService";
import * as reputation from "../services/transportReputationService";
import * as contacts from "../services/transportContactsService";
import * as loads from "../services/transportLoadsService";

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

export const businessCatalog = (req: AuthRequest, res: Response) => res.status(200).json(transportBusinessCatalog());

// ---------- Pagamentos, despesas e relatório ----------
export const payments = (req: AuthRequest, res: Response) =>
  run(res, () => finance.listPayments(req.userId!, req.userRole, { status: str(req.query.status), from: str(req.query.from), to: str(req.query.to), page: num(req.query.page) }));
export const payoutConfirm = (req: AuthRequest, res: Response) => run(res, () => finance.confirmPayout(req.userId!, req.userRole, req.params.id, req.body));
export const payoutContest = (req: AuthRequest, res: Response) => run(res, () => finance.contestPayout(req.userId!, req.userRole, req.params.id, req.body));
export const expenses = (req: AuthRequest, res: Response) =>
  run(res, () => finance.listExpenses(req.userId!, req.userRole, { kind: str(req.query.kind), from: str(req.query.from), to: str(req.query.to), page: num(req.query.page) }));
export const expenseAdd = (req: AuthRequest, res: Response) => run(res, () => finance.addExpense(req.userId!, req.userRole, req.body), 201);
export const expenseDelete = (req: AuthRequest, res: Response) => run(res, () => finance.deleteExpense(req.userId!, req.userRole, req.params.id));
export const financeReport = (req: AuthRequest, res: Response) => run(res, () => finance.financialReport(req.userId!, req.userRole, { from: str(req.query.from), to: str(req.query.to) }));

// ---------- Reputação ----------
export const reputationMine = (req: AuthRequest, res: Response) => run(res, () => reputation.getReputation(req.userId!, req.userRole));
export const toRate = (req: AuthRequest, res: Response) => run(res, () => reputation.listToRate(req.userId!, req.userRole));
export const rateParty = (req: AuthRequest, res: Response) => run(res, () => reputation.rateParty(req.userId!, req.userRole, req.params.id, req.body), 201);
export const partyReputation = (req: AuthRequest, res: Response) => run(res, () => reputation.partyReputation(req.userId!, req.userRole, req.params.userId));
export const complaints = (req: AuthRequest, res: Response) => run(res, () => reputation.complaintsAgainstMe(req.userId!, req.userRole));

// ---------- Contactos ----------
export const contactList = (req: AuthRequest, res: Response) => run(res, () => contacts.listContacts(req.userId!, req.userRole, { kind: str(req.query.kind), q: str(req.query.q) }));
export const contactLog = (req: AuthRequest, res: Response) => run(res, () => contacts.logContact(req.userId!, req.userRole, req.body), 201);
export const contactHistory = (req: AuthRequest, res: Response) => run(res, () => contacts.contactHistory(req.userId!, req.userRole, req.params.userId), 200, 404);
export const directory = (req: AuthRequest, res: Response) =>
  run(res, () => contacts.directory(req.userId!, req.userRole, { kind: str(req.query.kind), region: str(req.query.region), q: str(req.query.q), page: num(req.query.page) }));

// ---------- Ofertas e pedidos de transporte ----------
export const offerList = (req: AuthRequest, res: Response) => run(res, () => loads.listMyOffers(req.userId!, req.userRole));
export const offerCreate = (req: AuthRequest, res: Response) => run(res, () => loads.createOffer(req.userId!, req.userRole, req.body), 201);
export const offerUpdate = (req: AuthRequest, res: Response) => run(res, () => loads.updateOffer(req.userId!, req.userRole, req.params.id, req.body));
export const offerClose = (req: AuthRequest, res: Response) => run(res, () => loads.closeOffer(req.userId!, req.userRole, req.params.id));
export const requestList = (req: AuthRequest, res: Response) => run(res, () => loads.listRequests(req.userId!, req.userRole, { status: str(req.query.status) }));
export const requestRespond = (req: AuthRequest, res: Response) => run(res, () => loads.respondRequest(req.userId!, req.userRole, req.params.id, req.body));

// ---------- Para todas as pessoas ----------
export const publicOffers = (req: AuthRequest, res: Response) =>
  run(res, () => loads.listPublicOffers(req.userId!, { region: str(req.query.region), cargo: str(req.query.cargo), q: str(req.query.q), page: num(req.query.page) }));
export const publicOfferRequest = (req: AuthRequest, res: Response) => run(res, () => loads.createRequest(req.userId!, req.params.id, req.body), 201);
export const publicMyRequests = (req: AuthRequest, res: Response) => run(res, () => loads.myRequests(req.userId!));
