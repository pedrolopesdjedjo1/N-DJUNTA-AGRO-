import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { publicCategories, publicFeatured } from "../services/adminMarketService";
import { openDispute, replyDispute, myDisputes, myDispute } from "../services/adminDisputeService";
import { DISPUTE_REASONS } from "../lib/adminOpsCatalog";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

export const categories = (req: AuthRequest, res: Response) => run(res, () => publicCategories());
export const featured = (req: AuthRequest, res: Response) => run(res, () => publicFeatured());
export const disputeReasons = (req: AuthRequest, res: Response) => res.status(200).json(DISPUTE_REASONS);
export const disputeCreate = (req: AuthRequest, res: Response) => run(res, () => openDispute(req.userId!, req.body), 201);
export const disputesMine = (req: AuthRequest, res: Response) => run(res, () => myDisputes(req.userId!));
export const disputeOne = (req: AuthRequest, res: Response) => run(res, () => myDispute(req.userId!, req.params.id), 200, 404);
export const disputeReply = (req: AuthRequest, res: Response) => run(res, () => replyDispute(req.userId!, req.params.id, req.body?.message));
