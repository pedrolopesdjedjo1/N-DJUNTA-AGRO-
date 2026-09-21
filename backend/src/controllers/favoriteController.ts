import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { addFavorite, removeFavorite, listMyFavorites } from "../services/favoriteService";

export async function add(req: AuthRequest, res: Response) {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Informe o produto a favoritar." });
    }

    const favorite = await addFavorite(req.userId!, productId);
    return res.status(201).json(favorite);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    await removeFavorite(req.userId!, req.params.productId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const favorites = await listMyFavorites(req.userId!);
    return res.status(200).json(favorites);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
