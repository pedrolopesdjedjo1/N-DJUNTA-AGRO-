import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getDashboard,
  markSold,
  getBestSelling,
  getPayments,
  getReviews,
  getProfile,
  saveProfile,
  getMarket,
  compareMarket,
} from "../services/artisanService";

function fail(res: Response, error: any, status = 400) {
  return res.status(status).json({ error: error.message });
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function dashboard(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getDashboard(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function sold(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await markSold(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function bestSelling(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getBestSelling(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function payments(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getPayments(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function reviews(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getReviews(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function profile(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getProfile(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function putProfile(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await saveProfile(req.userId!, req.body));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function market(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getMarket());
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function compare(req: AuthRequest, res: Response) {
  try {
    return res
      .status(200)
      .json(await compareMarket(req.userId!, str(req.query.q), str(req.query.subcategory)));
  } catch (error: any) {
    return fail(res, error);
  }
}
