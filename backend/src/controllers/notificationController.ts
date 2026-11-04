import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listNotifications,
  countUnread,
  markAsRead,
  markAllAsRead,
  removeNotification,
} from "../services/notificationService";

function fail(res: Response, error: any) {
  const message = error?.message || "Erro inesperado.";
  const status = message.toLowerCase().includes("não encontrada") ? 404 : 400;
  return res.status(status).json({ error: message });
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const result = await listNotifications(req.userId!, {
      unreadOnly: req.query.unread === "true",
      limit: Number(req.query.limit) || undefined,
    });
    return res.json(result);
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function unreadCount(req: AuthRequest, res: Response) {
  try {
    return res.json(await countUnread(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function read(req: AuthRequest, res: Response) {
  try {
    return res.json(await markAsRead(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function readAll(req: AuthRequest, res: Response) {
  try {
    return res.json(await markAllAsRead(req.userId!));
  } catch (error: any) {
    return fail(res, error);
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    return res.json(await removeNotification(req.userId!, req.params.id));
  } catch (error: any) {
    return fail(res, error);
  }
}
