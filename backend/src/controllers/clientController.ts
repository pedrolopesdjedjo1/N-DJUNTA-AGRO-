import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getHome,
  getCategories,
  searchProducts,
  getProductDetail,
  getSellerPage,
  listFavorites,
  toggleProductFavorite,
  toggleSellerFavorite,
  setSellerNotify,
} from "../services/clientService";
import {
  listAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from "../services/addressService";

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

function num(value: any): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

export function home(req: AuthRequest, res: Response) {
  return run(res, () => getHome(req.userId!, str(req.query.region)));
}

export function categories(req: AuthRequest, res: Response) {
  return run(res, () => getCategories(req.userId!, str(req.query.region)));
}

export function products(req: AuthRequest, res: Response) {
  return run(res, () =>
    searchProducts(req.userId!, {
      q: str(req.query.q),
      category: str(req.query.category),
      department: str(req.query.department),
      subcategory: str(req.query.subcategory),
      location: str(req.query.location),
      near: req.query.near === "true",
      region: str(req.query.region),
      minPrice: num(req.query.minPrice),
      maxPrice: num(req.query.maxPrice),
      minRating: num(req.query.minRating),
      onlyPromo: req.query.onlyPromo === "true",
      sort: str(req.query.sort),
      page: num(req.query.page),
      limit: num(req.query.limit),
    })
  );
}

export function product(req: AuthRequest, res: Response) {
  return run(res, () => getProductDetail(req.userId!, req.params.id), 200, 404);
}

export function seller(req: AuthRequest, res: Response) {
  return run(res, () => getSellerPage(req.userId!, req.params.id), 200, 404);
}

export function favorites(req: AuthRequest, res: Response) {
  return run(res, () => listFavorites(req.userId!));
}

export function favoriteProduct(req: AuthRequest, res: Response) {
  return run(res, () => toggleProductFavorite(req.userId!, req.params.id));
}

export function favoriteSeller(req: AuthRequest, res: Response) {
  return run(res, () => toggleSellerFavorite(req.userId!, req.params.id));
}

export function sellerNotify(req: AuthRequest, res: Response) {
  return run(res, () => setSellerNotify(req.userId!, req.params.id, req.body.notify !== false));
}

export function addresses(req: AuthRequest, res: Response) {
  return run(res, () => listAddresses(req.userId!));
}

export function newAddress(req: AuthRequest, res: Response) {
  return run(res, () => createAddress(req.userId!, req.body), 201);
}

export function editAddress(req: AuthRequest, res: Response) {
  return run(res, () => updateAddress(req.userId!, req.params.id, req.body));
}

export function makeDefault(req: AuthRequest, res: Response) {
  return run(res, () => setDefaultAddress(req.userId!, req.params.id));
}

export function removeAddress(req: AuthRequest, res: Response) {
  return run(res, () => deleteAddress(req.userId!, req.params.id));
}
