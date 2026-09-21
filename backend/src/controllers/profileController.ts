import { Request, Response } from "express";
import { getPublicProfile } from "../services/profileService";

export async function getProfile(req: Request, res: Response) {
  try {
    const profile = await getPublicProfile(req.params.userId);
    return res.status(200).json(profile);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}
