import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  PAYMENT_OPTIONS,
  getCart,
  cartCount,
  addToCart,
  setCartQuantity,
  removeFromCart,
  clearCart,
  checkout,
} from "../services/cartService";

async function run(res: Response, work: () => Promise<any>, status = 200) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function cart(req: AuthRequest, res: Response) {
  return run(res, () => getCart(req.userId!, { addressId: str(req.query.addressId), region: str(req.query.region) }));
}

export function count(req: AuthRequest, res: Response) {
  return run(res, () => cartCount(req.userId!));
}

export function add(req: AuthRequest, res: Response) {
  return run(res, () => addToCart(req.userId!, String(req.body.productId ?? ""), req.body.quantity), 201);
}

export function setQuantity(req: AuthRequest, res: Response) {
  return run(res, () => setCartQuantity(req.userId!, req.params.productId, req.body.quantity));
}

export function remove(req: AuthRequest, res: Response) {
  return run(res, () => removeFromCart(req.userId!, req.params.productId));
}

export function clear(req: AuthRequest, res: Response) {
  return run(res, () => clearCart(req.userId!));
}

export function options(req: AuthRequest, res: Response) {
  return res.status(200).json({
    payment: PAYMENT_OPTIONS,
    delivery: [
      { value: "ENTREGA", label: "Entrega ao domicílio" },
      { value: "RECOLHA", label: "Recolha no vendedor" },
    ],
    note: "O pagamento é combinado diretamente com o vendedor.",
  });
}

export function placeOrder(req: AuthRequest, res: Response) {
  return run(res, () => checkout(req.userId!, req.body), 201);
}
