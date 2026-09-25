import { prisma } from "../lib/prisma";
interface CreateCooperativeInput {
  leaderId: string;
  name: string;
  description?: string;
  region: string;
}

export async function createCooperative(data: CreateCooperativeInput) {
  return prisma.cooperative.create({
    data: {
      name: data.name,
      description: data.description,
      region: data.region,
      leaderId: data.leaderId,
      members: {
        create: { userId: data.leaderId },
      },
    },
    include: { members: true },
  });
}

export async function listCooperatives(region?: string) {
  return prisma.cooperative.findMany({
    where: {
      region: region ? { contains: region, mode: "insensitive" } : undefined,
    },
    include: {
      leader: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCooperativeDetails(id: string) {
  const cooperative = await prisma.cooperative.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, name: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, role: true, location: true } },
        },
      },
    },
  });

  if (!cooperative) {
    throw new Error("Cooperativa não encontrada.");
  }

  return cooperative;
}

export async function joinCooperative(cooperativeId: string, userId: string) {
  const existing = await prisma.cooperativeMember.findUnique({
    where: { cooperativeId_userId: { cooperativeId, userId } },
  });

  if (existing) {
    throw new Error("Você já é membro desta cooperativa.");
  }

  return prisma.cooperativeMember.create({
    data: { cooperativeId, userId },
  });
}

export async function leaveCooperative(cooperativeId: string, userId: string) {
  const cooperative = await prisma.cooperative.findUnique({ where: { id: cooperativeId } });

  if (!cooperative) {
    throw new Error("Cooperativa não encontrada.");
  }

  if (cooperative.leaderId === userId) {
    throw new Error("O líder não pode sair da cooperativa. Transfira a liderança primeiro.");
  }

  const membership = await prisma.cooperativeMember.findUnique({
    where: { cooperativeId_userId: { cooperativeId, userId } },
  });

  if (!membership) {
    throw new Error("Você não é membro desta cooperativa.");
  }

  return prisma.cooperativeMember.delete({
    where: { cooperativeId_userId: { cooperativeId, userId } },
  });
}
