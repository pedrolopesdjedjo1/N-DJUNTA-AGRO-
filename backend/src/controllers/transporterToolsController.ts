import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { transportToolsCatalog } from "../lib/transportToolsCatalog";
import * as route from "../services/transportRouteService";
import * as tools from "../services/transportToolsService";
import * as incidents from "../services/transportIncidentService";
import * as devices from "../services/deviceService";

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

export const toolsCatalog = (req: AuthRequest, res: Response) => res.status(200).json(transportToolsCatalog());

// ---------- Mapa e rotas ----------
export const map = (req: AuthRequest, res: Response) => run(res, () => route.mapOverview(req.userId!, req.userRole, { lat: num(req.query.lat), lng: num(req.query.lng) }));
export const plan = (req: AuthRequest, res: Response) => run(res, () => route.routePlan(req.userId!, req.userRole, { lat: num(req.query.lat), lng: num(req.query.lng) }));
export const deliveryRoute = (req: AuthRequest, res: Response) =>
  run(res, () => route.routeForDelivery(req.userId!, req.userRole, req.params.id, { lat: num(req.query.lat), lng: num(req.query.lng) }), 200, 404);

// ---------- Serviços e segurança ----------
export const services = (req: AuthRequest, res: Response) =>
  run(res, () => tools.listServicePoints(req.userId!, req.userRole, { kind: str(req.query.kind), region: str(req.query.region), q: str(req.query.q), lat: num(req.query.lat), lng: num(req.query.lng), page: num(req.query.page) }));
export const serviceSuggest = (req: AuthRequest, res: Response) => run(res, () => tools.suggestServicePoint(req.userId!, req.userRole, req.body), 201);
export const serviceMine = (req: AuthRequest, res: Response) => run(res, () => tools.mySuggestions(req.userId!, req.userRole));
export const tips = (req: AuthRequest, res: Response) => run(res, () => tools.safetyTips(req.userId!, req.userRole));
export const security = (req: AuthRequest, res: Response) => run(res, () => tools.getSecurity(req.userId!, req.userRole));
export const settings = (req: AuthRequest, res: Response) => run(res, () => tools.getTransporterSettings(req.userId!, req.userRole));

// ---------- Emergência ----------
export const emergencyGet = (req: AuthRequest, res: Response) => run(res, () => incidents.getEmergencyContacts(req.userId!, req.userRole));
export const emergencySave = (req: AuthRequest, res: Response) => run(res, () => incidents.saveEmergencyContacts(req.userId!, req.userRole, req.body));
export const incidentCreate = (req: AuthRequest, res: Response) => run(res, () => incidents.createIncident(req.userId!, req.userRole, req.body), 201);
export const incidentList = (req: AuthRequest, res: Response) => run(res, () => incidents.listMyIncidents(req.userId!, req.userRole));
export const incidentOne = (req: AuthRequest, res: Response) => run(res, () => incidents.getMyIncident(req.userId!, req.userRole, req.params.id), 200, 404);
export const incidentResolve = (req: AuthRequest, res: Response) => run(res, () => incidents.resolveMyIncident(req.userId!, req.userRole, req.params.id, req.body));

// ---------- Aparelhos (para todas as pessoas) ----------
export const devicePing = (req: AuthRequest, res: Response) =>
  run(res, () => devices.pingDevice(req.userId!, req.body, { ip: req.ip, userAgent: String(req.headers["user-agent"] ?? "") }));
export const deviceList = (req: AuthRequest, res: Response) => run(res, () => devices.listDevices(req.userId!, str(req.query.deviceId)));
export const deviceRemove = (req: AuthRequest, res: Response) => run(res, () => devices.removeDevice(req.userId!, req.params.id), 200, 404);
