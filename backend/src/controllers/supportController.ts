import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createTicket, myTickets, allTickets, setTicketStatus } from "../services/supportService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createTicket(req.userId!, req.body), 201);
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myTickets(req.userId!));
}

export function all(req: AuthRequest, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  return run(res, () => allTickets(req.userRole, status));
}

export function setStatus(req: AuthRequest, res: Response) {
  return run(res, () => setTicketStatus(req.userRole, req.params.id, String(req.body.status ?? "")));
}
