import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createTransportOffer,
  listTransportOffers,
  updateTransportOffer,
  deleteTransportOffer,
} from "../services/transportService";

export async function create(req: AuthRequest, res: Response) {
  try {
    const { origin, destination, capacity, price, availableDate, notes } = req.body;

    if (!origin || !destination || !capacity || !price || !availableDate) {
      return res.status(400).json({
        error: "Preencha origem, destino, capacidade, preço e data disponível.",
      });
    }

    const offer = await createTransportOffer({
      transporterId: req.userId!,
      origin,
      destination,
      capacity,
      price,
      availableDate: new Date(availableDate),
      notes,
    });

    return res.status(201).json(offer);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const { origin, destination } = req.query;

    const offers = await listTransportOffers({
      origin: origin as string | undefined,
      destination: destination as string | undefined,
    });

    return res.status(200).json(offers);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const offer = await updateTransportOffer(req.params.id, req.userId!, req.body);
    return res.status(200).json(offer);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    await deleteTransportOffer(req.params.id, req.userId!);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
