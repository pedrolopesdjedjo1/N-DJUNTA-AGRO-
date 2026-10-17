import { prisma } from "../lib/prisma";
import { NEED_CATEGORIES, REQUEST_STATUS, values } from "../lib/ngoCatalog";
import { assertNgo } from "./organizationService";
import { createBeneficiary } from "./ngoCommunityService";

const CATEGORY_VALUES = values(NEED_CATEGORIES);
const STATUS_VALUES = values(REQUEST_STATUS);
const OPEN = ["NOVO", "EM_ANALISE"];
const MAX_OPEN_PER_USER = 5;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

async function notify(userId: string, title: string, message: string, relatedId: string) {
  await prisma.notification.create({ data: { userId, type: "SISTEMA", title, message, relatedId } });
}

// ---------- Quem pede apoio (qualquer pessoa) ----------
export async function createRequest(userId: string, input: any) {
  const category = String(input?.category ?? "");
  if (!CATEGORY_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de apoio que precisa.");
  }

  const title = clean(input?.title, 120);
  if (!title || title.length < 3) {
    throw new Error("Escreva um título curto para o pedido.");
  }
  const message = clean(input?.message, 1500);
  if (!message || message.length < 10) {
    throw new Error("Explique melhor o que precisa (pelo menos 10 letras).");
  }

  const open = await prisma.ngoSupportRequest.count({ where: { requesterId: userId, status: { in: OPEN } } });
  if (open >= MAX_OPEN_PER_USER) {
    throw new Error(`Já tem ${MAX_OPEN_PER_USER} pedidos em aberto. Espere pelas respostas.`);
  }

  let organizationId: string | null = null;
  if (input?.organizationId) {
    organizationId = String(input.organizationId);
    if (organizationId === userId) {
      throw new Error("Não pode enviar um pedido a si próprio.");
    }
    const org = await prisma.organization.findUnique({ where: { ownerId: organizationId } });
    if (!org) {
      throw new Error("Organização não encontrada.");
    }
  }

  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, location: true } });

  const created = await prisma.ngoSupportRequest.create({
    data: {
      requesterId: userId,
      organizationId,
      category,
      title,
      message,
      region: clean(input?.region, 80) ?? requester?.location ?? null,
      community: clean(input?.community, 80),
    },
  });

  if (organizationId) {
    await notify(organizationId, "Novo pedido de apoio", `${requester?.name ?? "Uma pessoa"} pediu apoio: ${title}`, created.id);
  }

  return created;
}

export async function myRequests(userId: string) {
  const rows = await prisma.ngoSupportRequest.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const orgIds = Array.from(new Set(rows.map((r) => r.organizationId).filter(Boolean))) as string[];
  const orgs = orgIds.length
    ? await prisma.organization.findMany({ where: { ownerId: { in: orgIds } }, select: { ownerId: true, name: true } })
    : [];
  const names = new Map(orgs.map((o) => [o.ownerId, o.name]));

  return rows.map((r) => ({
    ...r,
    organizationName: r.organizationId ? names.get(r.organizationId) ?? null : null,
  }));
}

export async function deleteOwnRequest(userId: string, id: string) {
  const found = await prisma.ngoSupportRequest.findUnique({ where: { id } });
  if (!found || found.requesterId !== userId) {
    throw new Error("Pedido não encontrado.");
  }
  if (found.status !== "NOVO") {
    throw new Error("Só pode apagar um pedido que ainda ninguém analisou.");
  }
  await prisma.ngoSupportRequest.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- A ONG recebe e responde ----------
export async function listRequestsForOrganization(
  userId: string,
  role: string | undefined,
  filters: { scope?: string; status?: string }
) {
  assertNgo(role);

  const mine = { organizationId: userId };
  const open = { organizationId: null, status: "NOVO" };

  const where: any =
    filters.scope === "mine" ? { ...mine } : filters.scope === "open" ? { ...open } : { OR: [mine, open] };
  if (filters.status && STATUS_VALUES.includes(filters.status)) {
    if (where.OR) {
      where.OR = [{ ...mine, status: filters.status }, ...(filters.status === "NOVO" ? [open] : [])];
    } else {
      where.status = filters.status;
    }
  }

  const [rows, newMine, openCount] = await Promise.all([
    prisma.ngoSupportRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.ngoSupportRequest.count({ where: { organizationId: userId, status: "NOVO" } }),
    prisma.ngoSupportRequest.count({ where: { organizationId: null, status: "NOVO" } }),
  ]);

  const requesterIds = Array.from(new Set(rows.map((r) => r.requesterId)));
  const users = requesterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { id: true, name: true, location: true, role: true, isVerified: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    counts: { newMine, open: openCount },
    items: rows.map((r) => ({ ...r, requester: userMap.get(r.requesterId) ?? null, isOpenRequest: r.organizationId === null })),
  };
}

export async function updateRequest(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);

  const found = await prisma.ngoSupportRequest.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Pedido não encontrado.");
  }

  const mine = found.organizationId === userId;
  const open = found.organizationId === null;
  if (!mine && !open) {
    throw new Error("Pedido não encontrado.");
  }
  if (open && found.status !== "NOVO") {
    throw new Error("Este pedido já não está aberto.");
  }

  const status = String(input?.status ?? "");
  if (!["EM_ANALISE", "ACEITE", "RECUSADO", "CONCLUIDO"].includes(status)) {
    throw new Error("Estado inválido.");
  }
  if (open && status !== "EM_ANALISE" && status !== "ACEITE") {
    throw new Error("Um pedido aberto só se pode assumir (em análise ou aceite). Se não pode ajudar, ignore-o.");
  }

  const answer = clean(input?.answer, 1000);
  if (status === "RECUSADO" && !answer) {
    throw new Error("Explique o motivo, para a pessoa perceber.");
  }

  const updated = await prisma.ngoSupportRequest.update({
    where: { id },
    data: { status, answer: answer ?? found.answer, organizationId: userId, handledById: userId },
  });

  const org = await prisma.organization.findUnique({ where: { ownerId: userId }, select: { name: true } });
  const titles: Record<string, string> = {
    EM_ANALISE: "O seu pedido de apoio está em análise",
    ACEITE: "O seu pedido de apoio foi aceite",
    RECUSADO: "O seu pedido de apoio não foi aceite",
    CONCLUIDO: "O seu pedido de apoio foi concluído",
  };
  await notify(
    found.requesterId,
    titles[status],
    `${org?.name ?? "A organização"}: ${found.title}${answer ? ` — ${answer}` : ""}`,
    id
  );

  return updated;
}

export async function requestToBeneficiary(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);

  const found = await prisma.ngoSupportRequest.findUnique({ where: { id } });
  if (!found || found.organizationId !== userId) {
    throw new Error("Pedido não encontrado.");
  }
  if (found.status !== "ACEITE" && found.status !== "CONCLUIDO") {
    throw new Error("Aceite o pedido antes de registar a pessoa como beneficiária.");
  }

  return createBeneficiary(userId, role, {
    userId: found.requesterId,
    projectId: input?.projectId,
    communityId: input?.communityId,
    region: found.region ?? undefined,
    supportGiven: found.title,
  });
}
