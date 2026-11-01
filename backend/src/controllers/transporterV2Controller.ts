import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { setVehicleStatus } from "../services/transporterService";
import { startTrip, arriveAtDestination, combineDeliveries, deliveryProof } from "../services/transportDeliveryService";

async function run(res: Response, work: () => Promise<any>, status = 200, errorStatus = 400) {
  try {
    return res.status(status).json(await work());
  } catch (error: any) {
    return res.status(errorStatus).json({ error: error.message });
  }
}

export function start(req: AuthRequest, res: Response) {
  return run(res, () => startTrip(req.userId!, req.userRole, req.params.id, req.body));
}

export function arrive(req: AuthRequest, res: Response) {
  return run(res, () => arriveAtDestination(req.userId!, req.userRole, req.params.id, req.body));
}

export function combine(req: AuthRequest, res: Response) {
  return run(res, () => combineDeliveries(req.userId!, req.userRole, req.params.id));
}

export function vehicleStatus(req: AuthRequest, res: Response) {
  return run(res, () => setVehicleStatus(req.userId!, req.userRole, req.body?.status, req.body?.note));
}

// Para o comprador, o vendedor e o transportador: as etapas e as fotos da entrega de uma encomenda
export function proof(req: AuthRequest, res: Response) {
  return run(res, () => deliveryProof(req.userId!, req.params.orderId), 200, 404);
}
