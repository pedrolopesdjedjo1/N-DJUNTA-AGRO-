import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getDashboardStats,
  listAllUsers,
  toggleUserActive,
  listAllProducts,
  removeProduct,
} from "../services/adminService";

export async function stats(_req: AuthRequest, res: Response) {
  try {
    const data = await getDashboardStats();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function users(_req: AuthRequest, res: Response) {
  try {
    const data = await listAllUsers();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function setUserActive(req: AuthRequest, res: Response) {
  try {
    const { isActive } = req.body;
    const user = await toggleUserActive(req.params.userId, isActive);
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function products(_req: AuthRequest, res: Response) {
  try {
    const data = await listAllProducts();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    await removeProduct(req.params.productId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
