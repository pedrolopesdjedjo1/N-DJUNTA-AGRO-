import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { listLearning, getLearning, createLearning, deleteLearning } from "../services/learningService";

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
    listLearning({ area: str(req.query.area), category: str(req.query.category), q: str(req.query.q) })
  );
}

export function one(req: AuthRequest, res: Response) {
  return run(res, () => getLearning(req.params.id), 200, 404);
}

export function create(req: AuthRequest, res: Response) {
  return run(res, () => createLearning(req.userId!, req.userRole, req.body), 201);
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => deleteLearning(req.userId!, req.userRole, req.params.id));
}
