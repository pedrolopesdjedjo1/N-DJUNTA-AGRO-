import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  sendMessage,
  getConversation,
  listMyConversations,
  markAsRead,
} from "../services/messageService";

export async function send(req: AuthRequest, res: Response) {
  try {
    const { receiverId, productId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: "Preencha o destinatário e a mensagem." });
    }

    const message = await sendMessage({
      senderId: req.userId!,
      receiverId,
      productId,
      content,
    });

    return res.status(201).json(message);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function conversation(req: AuthRequest, res: Response) {
  try {
    const { otherUserId } = req.params;
    const { productId } = req.query;

    const messages = await getConversation(
      req.userId!,
      otherUserId,
      productId as string | undefined
    );

    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function myConversations(req: AuthRequest, res: Response) {
  try {
    const conversations = await listMyConversations(req.userId!);
    return res.status(200).json(conversations);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function read(req: AuthRequest, res: Response) {
  try {
    const message = await markAsRead(req.params.id, req.userId!);
    return res.status(200).json(message);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
