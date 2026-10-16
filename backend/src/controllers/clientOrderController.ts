import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listOrders,
  getOrderDetail,
  cancelOrder,
  confirmReceived,
  changePaymentMethod,
  declarePayment,
  listPayments,
  getReceipt,
  getReviewables,
  createReview,
  myReviews,
  productReviews,
} from "../services/clientOrderService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

export function orders(req: AuthRequest, res: Response) {
  const tab = typeof req.query.tab === "string" ? req.query.tab : undefined;
  return run(res, () => listOrders(req.userId!, tab));
}

export function order(req: AuthRequest, res: Response) {
  return run(res, () => getOrderDetail(req.userId!, req.params.id), 200, 404);
}

export function cancel(req: AuthRequest, res: Response) {
  return run(res, () => cancelOrder(req.userId!, req.params.id));
}

export function received(req: AuthRequest, res: Response) {
  return run(res, () => confirmReceived(req.userId!, req.params.id));
}

export function paymentMethod(req: AuthRequest, res: Response) {
  return run(res, () => changePaymentMethod(req.userId!, req.params.id, req.body.method));
}

export function pay(req: AuthRequest, res: Response) {
  return run(res, () => declarePayment(req.userId!, req.params.id, req.body), 201);
}

export function payments(req: AuthRequest, res: Response) {
  return run(res, () => listPayments(req.userId!));
}

export function receipt(req: AuthRequest, res: Response) {
  return run(res, () => getReceipt(req.userId!, req.params.id));
}

export function reviewables(req: AuthRequest, res: Response) {
  return run(res, () => getReviewables(req.userId!, req.params.id));
}

export function review(req: AuthRequest, res: Response) {
  return run(res, () => createReview(req.userId!, req.params.id, req.body), 201);
}

export function mine(req: AuthRequest, res: Response) {
  return run(res, () => myReviews(req.userId!));
}

export function forProduct(req: AuthRequest, res: Response) {
  return run(res, () => productReviews(req.params.id));
}
