import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createCooperative,
  listCooperatives,
  getCooperativeDetails,
  joinCooperative,
  leaveCooperative,
} from "../services/cooperativeService";

export async function create(req: AuthRequest, res: Response) {
  try {
    const { name, description, region } = req.body;

    if (!name || !region) {
      return res.status(400).json({ error: "Preencha o nome e a região da cooperativa." });
    }

    const cooperative = await createCooperative({
      leaderId: req.userId!,
      name,
      description,
      region,
    });

    return res.status(201).json(cooperative);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const region = req.query.region as string | undefined;
    const cooperatives = await listCooperatives(region);
    return res.status(200).json(cooperatives);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const cooperative = await getCooperativeDetails(req.params.id);
    return res.status(200).json(cooperative);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}

export async function join(req: AuthRequest, res: Response) {
  try {
    const membership = await joinCooperative(req.params.id, req.userId!);
    return res.status(201).json(membership);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function leave(req: AuthRequest, res: Response) {
  try {
    await leaveCooperative(req.params.id, req.userId!);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
