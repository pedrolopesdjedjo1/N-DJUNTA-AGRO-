import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { listProducts } from "../services/productService";
import {
  getDashboard,
  getMyStore,
  saveStore,
  getPublicStore,
  getSales,
  listCustomers,
  getCustomerHistory,
  toggleFavoriteCustomer,
  listPromotions,
  createPromotion,
  removePromotion,
} from "../services/merchantService";

function fail(res: Response, error: any, status = 400) {
  return res.status(status).json({ error: error.message });
}

export async function dashboard(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getDashboard(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function myStore(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getMyStore(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function putStore(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await saveStore(req.userId!, req.body));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function publicStore(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getPublicStore(req.params.ownerId));
  } catch (error: any) {
    return fail(res, error, 404);
  }
}

export async function myProducts(req: AuthRequest, res: Response) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const department = typeof req.query.department === "string" ? req.query.department : undefined;
    const products = await listProducts({
      q,
      department,
      ownerId: req.userId!,
      includeUnavailable: true,
    });
    return res.status(200).json(products);
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function sales(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getSales(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function customers(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await listCustomers(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function customerHistory(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getCustomerHistory(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function favoriteCustomer(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await toggleFavoriteCustomer(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function promotions(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await listPromotions(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function newPromotion(req: AuthRequest, res: Response) {
  try {
    return res.status(201).json(await createPromotion(req.userId!, req.body));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function deletePromotion(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await removePromotion(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}
