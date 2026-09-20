import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SendMessageInput {
  senderId: string;
  receiverId: string;
  productId?: string;
  content: string;
}

export async function sendMessage(data: SendMessageInput) {
  if (data.senderId === data.receiverId) {
    throw new Error("Você não pode enviar mensagem para si mesmo.");
  }

  return prisma.message.create({
    data: {
      senderId: data.senderId,
      receiverId: data.receiverId,
      productId: data.productId,
      content: data.content,
    },
  });
}

// Lista a conversa entre dois usuários (opcionalmente sobre um produto específico)
export async function getConversation(userId: string, otherUserId: string, productId?: string) {
  return prisma.message.findMany({
    where: {
      productId: productId,
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

// Lista todas as conversas recentes do usuário (uma por pessoa com quem ele fala)
export async function listMyConversations(userId: string) {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
      product: { select: { id: true, title: true } },
    },
  });

  // Agrupa por "outra pessoa" e mantém só a mensagem mais recente de cada uma
  const conversationsMap = new Map<string, (typeof messages)[number]>();

  for (const message of messages) {
    const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
    const key = `${otherUserId}-${message.productId ?? "geral"}`;

    if (!conversationsMap.has(key)) {
      conversationsMap.set(key, message);
    }
  }

  return Array.from(conversationsMap.values());
}

export async function markAsRead(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message) {
    throw new Error("Mensagem não encontrada.");
  }

  if (message.receiverId !== userId) {
    throw new Error("Você não tem permissão para marcar esta mensagem como lida.");
  }

  return prisma.message.update({
    where: { id: messageId },
    data: { isRead: true },
  });
}
