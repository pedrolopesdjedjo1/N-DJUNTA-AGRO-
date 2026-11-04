import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { verifyToken } from "../utils/jwt";
import {
  listCooperatives,
  getCooperative,
  createCooperative,
  joinCooperative,
  leaveCooperative,
} from "../services/cooperativeService";

function fail(res: Response, error: any) {
  const message = error?.message || "Erro inesperado.";
  const status = message.toLowerCase().includes("não encontrada") ? 404 : 400;
  return res.status(status).json({ error: message });
}

// Ver cooperativas não exige login, mas se vier um token válido sabemos quem é a pessoa
function optionalUserId(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return undefined;
  try {
    return verifyToken(header.split(" ")[1]).userId;
  } catch {
    return undefined;
  }
}

export async function list(req: Request, res: Response) {
  try {
    const result = await listCooperatives(optionalUserId(req), {
      region: typeof req.query.region === "string" ? req.query.region : undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
    });
    return res.json(result);
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    return res.json(await getCooperative(optionalUserId(req), req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function create(req: AuthRequest, res: Response) {
  try {
    return res.status(201).json(await createCooperative(req.userId!, req.body));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function join(req: AuthRequest, res: Response) {
  try {
    return res.json(await joinCooperative(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function leave(req: AuthRequest, res: Response) {
  try {
    return res.json(await leaveCooperative(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}
