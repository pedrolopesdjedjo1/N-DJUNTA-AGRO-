import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { listContacts, logContact, contactHistory, directory } from "../services/transportContactsService";
import {
  listMyOffers,
  createOffer,
  updateOffer,
  closeOffer,
  listProposals,
  respondProposal,
  listPublicOffers,
  proposeToOffer,
  myProposalsSent,
} from "../services/transportOffersService";

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

// ---------- Contactos ----------
export const contacts = (req: AuthRequest, res: Response) => run(res, () => listContacts(req.userId!, req.userRole, { q: str(req.query.q), side: str(req.query.side) }));
export const contactLog = (req: AuthRequest, res: Response) => run(res, () => logContact(req.userId!, req.userRole, req.body), 201);
export const contactHistoryList = (req: AuthRequest, res: Response) =>
  run(res, () => contactHistory(req.userId!, req.userRole, { targetId: str(req.query.targetId), page: num(req.query.page) }));
export const directoryList = (req: AuthRequest, res: Response) =>
  run(res, () => directory(req.userId!, req.userRole, { kind: str(req.query.kind), region: str(req.query.region), q: str(req.query.q), page: num(req.query.page) }));

// ---------- Ofertas de transporte (o transportador) ----------
export const offersMine = (req: AuthRequest, res: Response) => run(res, () => listMyOffers(req.userId!, req.userRole));
export const offerCreate = (req: AuthRequest, res: Response) => run(res, () => createOffer(req.userId!, req.userRole, req.body), 201);
export const offerUpdate = (req: AuthRequest, res: Response) => run(res, () => updateOffer(req.userId!, req.userRole, req.params.id, req.body));
export const offerClose = (req: AuthRequest, res: Response) => run(res, () => closeOffer(req.userId!, req.userRole, req.params.id));
export const proposals = (req: AuthRequest, res: Response) => run(res, () => listProposals(req.userId!, req.userRole, { status: str(req.query.status) }));
export const proposalRespond = (req: AuthRequest, res: Response) => run(res, () => respondProposal(req.userId!, req.userRole, req.params.id, req.body));

// ---------- Para todas as pessoas ----------
export const offersPublic = (req: AuthRequest, res: Response) =>
  run(res, () =>
    listPublicOffers(req.userId!, {
      fromRegion: str(req.query.fromRegion),
      toRegion: str(req.query.toRegion),
      cargo: str(req.query.cargo),
      from: str(req.query.from),
      to: str(req.query.to),
      q: str(req.query.q),
      page: num(req.query.page),
    })
  );
export const offerPropose = (req: AuthRequest, res: Response) => run(res, () => proposeToOffer(req.userId!, req.params.id, req.body), 201);
export const proposalsSent = (req: AuthRequest, res: Response) => run(res, () => myProposalsSent(req.userId!));
