import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { listContacts, createContact, deleteContact } from "../services/contactService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function list(req: AuthRequest, res: Response) {
  return run(res, () =>
    listContacts({ kind: str(req.query.kind), region: str(req.query.region), q: str(req.query.q) })
  );
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createContact(req.userId!, req.userRole, req.body), 201);
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deleteContact(req.userId!, req.userRole, req.params.id));
}
