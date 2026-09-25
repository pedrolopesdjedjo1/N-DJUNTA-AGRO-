import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { calculateFee } from "./platformSettingsService";
import { prisma } from "../lib/prisma";

interface CreatePaymentInput {
  buyerId: string;
  sellerId: string;
  productId?: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export async function createPayment(data: CreatePaymentInput) {
  if (data.buyerId === data.sellerId) {
    throw new Error("Comprador e vendedor não podem ser a mesma pessoa.");
  }

  return prisma.payment.create({
    data: {
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      productId: data.productId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
    },
  });
}

// Lista pagamentos onde o usuário é comprador OU vendedor
export async function listMyPayments(userId: string) {
  return prisma.payment.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Só o vendedor pode confirmar que recebeu o pagamento
export async function confirmPayment(paymentId: string, sellerId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!payment) {
    throw new Error("Pagamento não encontrado.");
  }

  if (payment.sellerId !== sellerId) {
    throw new Error("Só o vendedor pode confirmar este pagamento.");
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.CONFIRMADO },
  });
}

export async function cancelPayment(paymentId: string, userId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!payment) {
    throw new Error("Pagamento não encontrado.");
  }

  if (payment.buyerId !== userId && payment.sellerId !== userId) {
    throw new Error("Você não tem permissão para cancelar este pagamento.");
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.CANCELADO },
  });
}
