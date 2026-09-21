import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  listMyNotifications,
  markAsRead,
  markAllAsRead,
  countUnread,
} from "../services/notificationService";

export async function list(req: AuthRequest, res: Response) {
  try {
    const onlyUnread = req.query.unread === "true";
    const notifications = await listMyNotifications(req.userId!, onlyUnread);
    return res.status(200).json(notifications);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function read(req: AuthRequest, res: Response) {
  try {
    const notification = await markAsRead(req.params.id, req.userId!);
    return res.status(200).json(notification);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function readAll(req: AuthRequest, res: Response) {
  try {
    await markAllAsRead(req.userId!);
    return res.status(200).json({ message: "Todas as notificações foram marcadas como lidas." });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function unreadCount(req: AuthRequest, res: Response) {
  try {
    const count = await countUnread(req.userId!);
    return res.status(200).json({ count });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
