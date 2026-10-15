import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createSos, mySos, updateLocation, closeOwn, listActive, setStatus } from "../services/sosService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createSos(req.userId!, req.body), 201);
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => mySos(req.userId!));
}

export function location(req: AuthRequest, res: Response) {
  return run(res, () => updateLocation(req.userId!, req.params.id, req.body));
}

export function close(req: AuthRequest, res: Response) {
  return run(res, () => closeOwn(req.userId!, req.params.id, String(req.body.status ?? "")));
}

export function active(req: AuthRequest, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  return run(res, () => listActive(req.userRole, status));
}

export function status(req: AuthRequest, res: Response) {
  return run(res, () => setStatus(req.userId!, req.userRole, req.params.id, String(req.body.status ?? "")));
}
