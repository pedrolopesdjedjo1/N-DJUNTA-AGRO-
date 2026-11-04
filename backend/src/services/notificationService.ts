import { prisma } from "../lib/prisma";

type NotificationKind = "MENSAGEM" | "AVALIACAO" | "PRODUTO" | "SISTEMA";

// Cria um aviso para uma pessoa (outros serviços podem chamar esta função)
export async function createNotification(
  userId: string,
  type: NotificationKind,
  title: string,
  message: string,
  relatedId?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, message: message.slice(0, 300), relatedId },
  });
}

// Lista os avisos da própria pessoa, os mais recentes primeiro
export async function listNotifications(userId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(options.unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, unreadCount };
}

export async function countUnread(userId: string) {
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
  return { unreadCount };
}

// Só marca avisos que pertencem à pessoa que fez o pedido
export async function markAsRead(userId: string, id: string) {
  const found = await prisma.notification.findFirst({ where: { id, userId } });
  if (!found) throw new Error("Notificação não encontrada.");

  if (found.isRead) return found;
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

export async function removeNotification(userId: string, id: string) {
  const found = await prisma.notification.findFirst({ where: { id, userId } });
  if (!found) throw new Error("Notificação não encontrada.");

  await prisma.notification.delete({ where: { id } });
  return { message: "Notificação apagada." };
}
