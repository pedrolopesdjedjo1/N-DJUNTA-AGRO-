import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createPayment, listMyPayments, confirmPayment, cancelPayment } from "../services/paymentService";

export async function create(req: AuthRequest, res: Response) {
  try {
    const { sellerId, productId, amount, method, notes } = req.body;

    if (!sellerId || !amount || !method) {
      return res.status(400).json({
        error: "Preencha o vendedor, o valor e a forma de pagamento.",
      });
    }

    const payment = await createPayment({
      buyerId: req.userId!,
      sellerId,
      productId,
      amount,
      method,
      notes,
    });

    return res.status(201).json(payment);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const payments = await listMyPayments(req.userId!);
    return res.status(200).json(payments);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function confirm(req: AuthRequest, res: Response) {
  try {
    const payment = await confirmPayment(req.params.id, req.userId!);
    return res.status(200).json(payment);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function cancel(req: AuthRequest, res: Response) {
  try {
    const payment = await cancelPayment(req.params.id, req.userId!);
    return res.status(200).json(payment);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
