import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listEvents,
  myEvents,
  getEvent,
  createEvent,
  deleteEvent,
  toggleRegistration,
  listRegistrations,
} from "../services/eventService";

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

export function list(req: AuthRequest, res: Response) {
  return run(res, () =>
    listEvents(req.userId!, {
      kind: str(req.query.kind),
      area: str(req.query.area),
      when: str(req.query.when),
      q: str(req.query.q),
    })
  );
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myEvents(req.userId!));
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getEvent(req.params.id, req.userId!), 200, 404);
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createEvent(req.userId!, req.userRole, req.body), 201);
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deleteEvent(req.userId!, req.userRole, req.params.id));
}

export function register(req: AuthRequest, res: Response) {
  return run(res, () => toggleRegistration(req.userId!, req.params.id));
}

export function registrations(req: AuthRequest, res: Response) {
  return run(res, () => listRegistrations(req.userId!, req.userRole, req.params.id));
}
