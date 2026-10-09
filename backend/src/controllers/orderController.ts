import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  setPaid,
  listTransporters,
  requestDelivery,
  listDeliveries,
  updateDeliveryStatus,
} from "../services/orderService";

function fail(res: Response, error: any, status = 400) {
  return res.status(status).json({ error: error.message });
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const { items, deliveryOption, deliveryAddress, notes } = req.body;
    const order = await createOrder({
      buyerId: req.userId!,
      items,
      deliveryOption,
      deliveryAddress,
      notes,
    });
    return res.status(201).json(order);
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const as = req.query.as === "buyer" ? "buyer" : "seller";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    return res.status(200).json(await listOrders(req.userId!, as, status));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function one(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await getOrder(req.params.id, req.userId!));
  } catch (error: any) {
    return fail(res, error, 404);
  }
}

export async function setStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Informe o novo estado." });
    }
    return res.status(200).json(await updateOrderStatus(req.params.id, req.userId!, String(status)));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function markPaid(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await setPaid(req.params.id, req.userId!, Boolean(req.body.paid)));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function transporters(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await listTransporters());
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function askDelivery(req: AuthRequest, res: Response) {
  try {
    const { transporterId, offerId, price, pickupAt } = req.body;
    if (!transporterId) {
      return res.status(400).json({ error: "Escolha um transportador." });
    }
    const delivery = await requestDelivery(req.params.id, req.userId!, {
      transporterId,
      offerId,
      price,
      pickupAt,
    });
    return res.status(201).json(delivery);
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function deliveries(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json(await listDeliveries(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function setDeliveryStatus(req: AuthRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Informe o novo estado." });
    }
    const result = await updateDeliveryStatus(req.params.deliveryId, req.userId!, String(status));
    return res.status(200).json(result);
  } catch (error: any) {
    return fail(res, error);
  }
}
