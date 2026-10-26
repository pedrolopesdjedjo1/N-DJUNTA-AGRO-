import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { transportCatalog } from "../lib/transportCatalog";
import { getProfile, saveProfile, setAvailability } from "../services/transporterService";
import {
  listAvailable,
  listMine,
  getDelivery,
  acceptDelivery,
  declineDelivery,
  releaseDelivery,
  collectDelivery,
  deliverDelivery,
  updateLocation,
  reportProblem,
} from "../services/transportDeliveryService";
import { getHome, getEarnings, getRatings } from "../services/transportHomeService";

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

export function catalog(req: AuthRequest, res: Response) {
  return res.status(200).json(transportCatalog());
}

export function home(req: AuthRequest, res: Response) {
  return run(res, () => getHome(req.userId!, req.userRole));
}

export function earnings(req: AuthRequest, res: Response) {
  return run(res, () => getEarnings(req.userId!, req.userRole));
}

export function ratings(req: AuthRequest, res: Response) {
  return run(res, () => getRatings(req.userId!, req.userRole));
}

// ---------- Perfil ----------
export function profile(req: AuthRequest, res: Response) {
  return run(res, () => getProfile(req.userId!, req.userRole));
}

export function saveMyProfile(req: AuthRequest, res: Response) {
  return run(res, () => saveProfile(req.userId!, req.userRole, req.body));
}

export function availability(req: AuthRequest, res: Response) {
  return run(res, () => setAvailability(req.userId!, req.userRole, req.body?.isAvailable));
}

// ---------- Entregas ----------
export function available(req: AuthRequest, res: Response) {
  return run(res, () =>
    listAvailable(req.userId!, req.userRole, {
      scope: str(req.query.scope),
      region: str(req.query.region),
      fit: str(req.query.fit),
      q: str(req.query.q),
      sort: str(req.query.sort),
      page: num(req.query.page),
    })
  );
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => listMine(req.userId!, req.userRole, { phase: str(req.query.phase), q: str(req.query.q), page: num(req.query.page) }));
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getDelivery(req.userId!, req.userRole, req.params.id), 200, 404);
}

export function accept(req: AuthRequest, res: Response) {
  return run(res, () => acceptDelivery(req.userId!, req.userRole, req.params.id));
}

export function decline(req: AuthRequest, res: Response) {
  return run(res, () => declineDelivery(req.userId!, req.userRole, req.params.id));
}

export function release(req: AuthRequest, res: Response) {
  return run(res, () => releaseDelivery(req.userId!, req.userRole, req.params.id, req.body));
}

export function collect(req: AuthRequest, res: Response) {
  return run(res, () => collectDelivery(req.userId!, req.userRole, req.params.id, req.body));
}

export function deliver(req: AuthRequest, res: Response) {
  return run(res, () => deliverDelivery(req.userId!, req.userRole, req.params.id, req.body));
}

export function location(req: AuthRequest, res: Response) {
  return run(res, () => updateLocation(req.userId!, req.userRole, req.params.id, req.body));
}

export function problem(req: AuthRequest, res: Response) {
  return run(res, () => reportProblem(req.userId!, req.userRole, req.params.id, req.body), 201);
}
