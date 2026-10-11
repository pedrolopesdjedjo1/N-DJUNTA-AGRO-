import { TicketKind, TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function createTicket(userId: string, input: any) {
  const subject = clean(input?.subject, 150);
  const message = clean(input?.message, 2000);
  if (!subject || !message) {
    throw new Error("Preencha o assunto e a mensagem.");
  }

  const kind = String(input.kind ?? "OUTRO");
  if (!(Object.values(TicketKind) as string[]).includes(kind)) {
    throw new Error("Tipo de pedido inválido.");
  }

  const open = await prisma.supportTicket.count({
    where: { userId, status: { not: TicketStatus.RESOLVIDO } },
  });
  if (open >= 10) {
    throw new Error("Você já tem muitos pedidos em aberto. Aguarde a resposta da equipa.");
  }

  let orderId: string | null = null;
  if (input.orderId) {
    const order = await prisma.order.findUnique({ where: { id: String(input.orderId) } });
    if (!order || (order.buyerId !== userId && order.sellerId !== userId)) {
      throw new Error("Pedido não encontrado.");
    }
    orderId = order.id;
  }

  const ticket = await prisma.supportTicket.create({
    data: { userId, orderId, kind: kind as TicketKind, subject, message },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "SISTEMA" as const,
        title: "Novo pedido de ajuda",
        message: subject,
        relatedId: ticket.id,
      })),
    });
  }

  return ticket;
}

export async function myTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function allTickets(role: string | undefined, status?: string) {
  if (role !== "ADMIN") {
    throw new Error("Acesso restrito à equipa de suporte.");
  }

  const where: any = {};
  if (status && (Object.values(TicketStatus) as string[]).includes(status)) where.status = status;

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const users = await usersByIds(tickets.map((t) => t.userId));

  return tickets.map((t) => ({
    ...t,
    user: users.get(t.userId) ?? null,
  }));
}

export async function setTicketStatus(role: string | undefined, id: string, status: string) {
  if (role !== "ADMIN") {
    throw new Error("Acesso restrito à equipa de suporte.");
  }
  if (!(Object.values(TicketStatus) as string[]).includes(status)) {
    throw new Error("Estado inválido.");
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    throw new Error("Pedido não encontrado.");
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: { status: status as TicketStatus },
  });

  await prisma.notification.create({
    data: {
      userId: ticket.userId,
      type: "SISTEMA",
      title: "O seu pedido de ajuda foi atualizado",
      message: `${ticket.subject}: ${status}`,
      relatedId: id,
    },
  });

  return updated;
}
