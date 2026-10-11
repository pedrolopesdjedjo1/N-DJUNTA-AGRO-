import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { listMyCooperatives, listPosts, createPost, deletePost } from "../services/communityService";

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

export function cooperatives(req: AuthRequest, res: Response) {
  return run(res, () => listMyCooperatives(req.userId!));
}

export function posts(req: AuthRequest, res: Response) {
  return run(res, () =>
    listPosts(req.userId!, {
      kind: str(req.query.kind),
      cooperativeId: str(req.query.cooperativeId),
      q: str(req.query.q),
      mine: req.query.mine === "true",
    })
  );
}

export function newPost(req: AuthRequest, res: Response) {
  return run(res, () => createPost(req.userId!, req.body), 201);
}

export function removePost(req: AuthRequest, res: Response) {
  return run(res, () => deletePost(req.userId!, req.userRole, req.params.id));
}
