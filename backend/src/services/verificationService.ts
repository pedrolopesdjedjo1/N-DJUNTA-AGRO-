import { VerificationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface RequestVerificationInput {
  userId: string;
  documentType: string;
  documentNote?: string;
}

export async function requestVerification(data: RequestVerificationInput) {
  const existing = await prisma.verificationRequest.findFirst({
    where: { userId: data.userId, status: VerificationStatus.PENDENTE },
  });

  if (existing) {
    throw new Error("Você já tem um pedido de verificação pendente.");
  }

  return prisma.verificationRequest.create({
    data: {
      userId: data.userId,
      documentType: data.documentType,
      documentNote: data.documentNote,
    },
  });
}

// Usado pelo admin - lista pedidos, com opção de filtrar por status
export async function listRequests(status?: VerificationStatus) {
  return prisma.verificationRequest.findMany({
    where: { status },
    include: {
      user: { select: { id: true, name: true, role: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Usado pelo admin - aprova ou rejeita, e atualiza o selo do usuário
export async function reviewRequest(requestId: string, approve: boolean) {
  const request = await prisma.verificationRequest.findUnique({ where: { id: requestId } });

  if (!request) {
    throw new Error("Pedido de verificação não encontrado.");
  }

  const newStatus = approve ? VerificationStatus.APROVADO : VerificationStatus.REJEITADO;

  const [updatedRequest] = await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: { isVerified: approve },
    }),
  ]);

  return updatedRequest;
}
