import { prisma } from "../lib/prisma";
import { createNotification } from "./notificationService";

// Cooperativas que a equipa do app recusou ou suspendeu não aparecem na lista pública
const HIDDEN_STATUS = ["SUSPENSA", "RECUSADA"];
const MAX_LIST = 100;

function text(value: any, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function hiddenIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const reviews = await prisma.cooperativeReview.findMany({
    where: { cooperativeId: { in: ids }, status: { in: HIDDEN_STATUS } },
    select: { cooperativeId: true },
  });
  return new Set(reviews.map((r) => r.cooperativeId));
}

async function leadersOf(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map<string, { id: string; name: string; phone: string | null }>();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, phone: true },
  });
  return new Map(users.map((u) => [u.id, u as { id: string; name: string; phone: string | null }]));
}

// Ver a lista não exige login; sem login não se mostra o telefone do líder
export async function listCooperatives(userId: string | undefined, filters: { region?: string; q?: string } = {}) {
  const where: any = {};
  const region = text(filters.region, 80);
  const q = text(filters.q, 80);
  if (region) where.region = { contains: region, mode: "insensitive" };
  if (q) where.name = { contains: q, mode: "insensitive" };

  const coops = await prisma.cooperative.findMany({
    where,
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: MAX_LIST,
  });

  const hidden = await hiddenIds(coops.map((c) => c.id));
  const visible = coops.filter((c) => !hidden.has(c.id) || c.leaderId === userId);

  const joinedIds = new Set<string>();
  if (userId) {
    const mine = await prisma.cooperativeMember.findMany({ where: { userId }, select: { cooperativeId: true } });
    mine.forEach((m) => joinedIds.add(m.cooperativeId));
  }

  const leaders = await leadersOf(visible.map((c) => c.leaderId));

  const cooperatives = visible.map((c) => {
    const leader = leaders.get(c.leaderId);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      region: c.region,
      members: c._count.members,
      joined: c.leaderId === userId || joinedIds.has(c.id),
      suspended: hidden.has(c.id),
      leader: {
        id: c.leaderId,
        name: leader?.name ?? "Líder",
        phone: userId ? leader?.phone ?? null : null,
      },
    };
  });

  return { cooperatives };
}

export async function getCooperative(userId: string | undefined, id: string) {
  const coop = await prisma.cooperative.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!coop) throw new Error("Cooperativa não encontrada.");

  const hidden = await hiddenIds([id]);
  const isLeader = coop.leaderId === userId;
  if (hidden.has(id) && !isLeader) throw new Error("Cooperativa não encontrada.");

  let joined = isLeader;
  if (userId && !joined) {
    const member = await prisma.cooperativeMember.findFirst({ where: { cooperativeId: id, userId } });
    joined = !!member;
  }

  const review = await prisma.cooperativeReview.findUnique({ where: { cooperativeId: id } });
  const leaders = await leadersOf([coop.leaderId]);
  const leader = leaders.get(coop.leaderId);

  return {
    cooperative: {
      id: coop.id,
      name: coop.name,
      description: coop.description,
      region: coop.region,
      createdAt: coop.createdAt,
    },
    leader: leader ? { id: leader.id, name: leader.name, phone: userId ? leader.phone : null } : null,
    members: coop._count.members,
    joined,
    isLeader,
    status: review?.status ?? "SEM_ANALISE",
    // O motivo só é mostrado ao líder
    note: isLeader && hidden.has(id) ? review?.note ?? null : null,
  };
}

export async function createCooperative(userId: string, input: any) {
  const name = text(input?.name, 80);
  const region = text(input?.region, 80);
  const description = text(input?.description, 500);

  if (name.length < 3) throw new Error("Escreva o nome da cooperativa (pelo menos 3 letras).");
  if (!region) throw new Error("Escolha a região da cooperativa.");

  const duplicate = await prisma.cooperative.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      region: { equals: region, mode: "insensitive" },
    },
  });
  if (duplicate) throw new Error("Já existe uma cooperativa com este nome nesta região.");

  const coop = await prisma.cooperative.create({
    data: { name, region, description: description || null, leaderId: userId },
  });

  return { message: "Cooperativa criada. Você é o líder.", cooperative: coop };
}

export async function joinCooperative(userId: string, id: string) {
  const coop = await prisma.cooperative.findUnique({ where: { id } });
  if (!coop) throw new Error("Cooperativa não encontrada.");

  const hidden = await hiddenIds([id]);
  if (hidden.has(id)) throw new Error("Esta cooperativa não está disponível neste momento.");

  if (coop.leaderId === userId) throw new Error("Você é o líder desta cooperativa.");

  const already = await prisma.cooperativeMember.findFirst({ where: { cooperativeId: id, userId } });
  if (already) throw new Error("Você já faz parte desta cooperativa.");

  await prisma.cooperativeMember.create({ data: { cooperativeId: id, userId } });

  const person = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await createNotification(
    coop.leaderId,
    "SISTEMA",
    "Novo membro na cooperativa",
    `${person?.name ?? "Uma pessoa"} entrou na cooperativa ${coop.name}.`,
    coop.id
  );

  return { message: "Você entrou na cooperativa." };
}

export async function leaveCooperative(userId: string, id: string) {
  const coop = await prisma.cooperative.findUnique({ where: { id } });
  if (!coop) throw new Error("Cooperativa não encontrada.");

  if (coop.leaderId === userId) {
    throw new Error("O líder não pode sair da cooperativa. Fale com o suporte para passar a liderança.");
  }

  const removed = await prisma.cooperativeMember.deleteMany({ where: { cooperativeId: id, userId } });
  if (removed.count === 0) throw new Error("Você não faz parte desta cooperativa.");

  return { message: "Você saiu da cooperativa." };
}
