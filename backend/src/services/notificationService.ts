import { PrismaClient, NotificationType } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
}

// Usado internamente por outros módulos (ex: ao enviar mensagem, ao criar avaliação)
export async function createNotification(data: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedId: data.relatedId,
    },
  });
}

export async function listMyNotifications(userId: string, onlyUnread: boolean) {
  return prisma.notification.findMany({
    where: {
      userId,
      isRead: onlyUnread ? false : undefined,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });

  if (!notification) {
    throw new Error("Notificação não encontrada.");
  }

  if (notification.userId !== userId) {
    throw new Error("Você não tem permissão para marcar esta notificação como lida.");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function countUnread(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}
