import { prisma } from "../lib/prisma";
import { findRegion } from "../lib/ngoRegions";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { BUYER_ROLES, roleName } from "../lib/adminUserCatalog";
import { CONTACT_VIA, DIRECTORY_KINDS } from "../lib/transportMoneyCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";

const PAGE_SIZE = 20;
const VIA_VALUES = values(CONTACT_VIA);

// =====================================================================
// Contactos: as pessoas das minhas entregas, com telefone
// =====================================================================
export async function listContacts(userId: string, role: string | undefined, filters: { q?: string; side?: string }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const cards = await loadMineCards(userId, profile);

  const map = new Map<string, any>();
  cards.forEach((c) => {
    ([
      ["BUYER", c.buyer],
      ["SELLER", c.seller],
    ] as [string, any][]).forEach(([side, p]) => {
      if (!p?.id) return;
      const row = map.get(p.id) ?? { id: p.id, name: p.name, location: p.location ?? null, isVerified: !!p.isVerified, deliveries: 0, completed: 0, asBuyer: 0, asSeller: 0, lastDeliveryAt: null };
      row.deliveries += 1;
      if (c.phase === "ENTREGUE") row.completed += 1;
      if (side === "BUYER") row.asBuyer += 1;
      else row.asSeller += 1;
      if (!row.lastDeliveryAt || new Date(c.createdAt) > new Date(row.lastDeliveryAt)) row.lastDeliveryAt = c.createdAt;
      map.set(p.id, row);
    });
  });

  const ids = Array.from(map.keys());
  const [users, logs] = ids.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true, phone: true, photoUrl: true } }),
        prisma.contactLog.groupBy({ by: ["targetId"], where: { userId, targetId: { in: ids } }, _max: { createdAt: true }, _count: { _all: true } }),
      ])
    : [[], []];
  const userMap = new Map((users as any[]).map((u) => [u.id, u]));
  const logMap = new Map((logs as any[]).map((l) => [l.targetId, l]));

  const needle = plain(filters.q);
  let items = Array.from(map.values()).map((r) => {
    const u = userMap.get(r.id);
    const log = logMap.get(r.id);
    return {
      ...r,
      roleName: u ? roleName(u.role) : "",
      phone: u?.phone ?? null,
      photoUrl: u?.photoUrl ?? null,
      contacts: log?._count._all ?? 0,
      lastContactAt: log?._max.createdAt ?? null,
    };
  });

  if (filters.side === "BUYER") items = items.filter((i) => i.asBuyer > 0);
  if (filters.side === "SELLER") items = items.filter((i) => i.asSeller > 0);
  if (needle) items = items.filter((i) => plain(`${i.name} ${i.location}`).includes(needle));
  items.sort((a, b) => new Date(b.lastDeliveryAt ?? 0).getTime() - new Date(a.lastDeliveryAt ?? 0).getTime());

  return { total: items.length, items };
}

// =====================================================================
// Histórico de contactos
// =====================================================================
export async function logContact(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);

  const via = String(input?.via ?? "");
  if (!VIA_VALUES.includes(via)) {
    throw new Error("Escolha como falou com a pessoa.");
  }
  const target = input?.targetId ? await prisma.user.findUnique({ where: { id: String(input.targetId) }, select: { id: true } }) : null;
  if (!target || target.id === userId) {
    throw new Error("Pessoa não encontrada.");
  }

  const today = await prisma.contactLog.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 86400000) } } });
  if (today >= 100) {
    throw new Error("Já registou muitos contactos hoje.");
  }

  let deliveryId: string | null = null;
  if (input?.deliveryId) {
    const d = await prisma.delivery.findUnique({ where: { id: String(input.deliveryId) } });
    if (d && d.transporterId === userId) deliveryId = d.id;
  }

  const log = await prisma.contactLog.create({ data: { userId, targetId: target.id, deliveryId, via, note: clean(input?.note, 200) } });
  return { id: log.id };
}

export async function contactHistory(userId: string, role: string | undefined, filters: { targetId?: string; page?: number }) {
  assertTransporter(role);

  const where: any = { userId };
  if (filters.targetId) where.targetId = filters.targetId;

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.contactLog.count({ where }),
    prisma.contactLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30 }),
  ]);

  const people = rows.length ? await prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.targetId))) } }, select: { id: true, name: true } }) : [];
  const names = new Map(people.map((p) => [p.id, p.name]));

  return {
    total,
    page,
    pageSize: 30,
    items: rows.map((r) => ({ id: r.id, targetId: r.targetId, targetName: names.get(r.targetId) ?? "Utilizador", via: r.via, note: r.note, deliveryId: r.deliveryId, createdAt: r.createdAt })),
  };
}

// =====================================================================
// Com quem posso falar: agricultores, pescadores, artesãos, comerciantes, compradores e agentes
// Nunca mostra telefones: a conversa faz-se pelas mensagens do app.
// =====================================================================
export async function directory(userId: string, role: string | undefined, filters: { kind?: string; region?: string; q?: string; page?: number }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const def = DIRECTORY_KINDS.find((k) => k.value === filters.kind) ?? DIRECTORY_KINDS[0];
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const needle = plain(filters.q);

  let ids: string[] | null = null;
  const agentAreas = new Map<string, string[]>();
  if (def.roles === "AGENT") {
    const agents = await prisma.agentProfile.findMany({ where: { status: "APROVADO" }, select: { userId: true, areas: true }, take: 500 });
    ids = agents.map((a) => a.userId);
    agents.forEach((a) => agentAreas.set(a.userId, a.areas));
  }

  const roles = def.roles === "BUYER" ? BUYER_ROLES : def.roles === "AGENT" ? ["AGENTE"] : def.roles;
  const users = await prisma.user.findMany({
    where: { isActive: true, id: { not: userId }, role: { in: roles as any }, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true, name: true, role: true, location: true, photoUrl: true, isVerified: true },
    orderBy: { name: "asc" },
    take: 2000,
  });

  let list = users.filter((u) => !filters.region || findRegion(u.location)?.key === filters.region);
  if (needle) list = list.filter((u) => plain(`${u.name} ${u.location}`).includes(needle));

  const total = list.length;
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sliceIds = slice.map((u) => u.id);

  const [products, mineCards] = sliceIds.length
    ? await Promise.all([
        prisma.product.groupBy({ by: ["ownerId"], where: { ownerId: { in: sliceIds }, isAvailable: true }, _count: { _all: true } }),
        loadMineCards(userId, profile),
      ])
    : [[], [] as any[]];
  const productMap = new Map((products as any[]).map((p) => [p.ownerId, p._count._all]));
  const together = new Map<string, number>();
  (mineCards as any[]).forEach((c) => [c.buyer?.id, c.seller?.id].forEach((id) => id && together.set(id, (together.get(id) ?? 0) + 1)));

  return {
    kind: def.value,
    total,
    page,
    pageSize: PAGE_SIZE,
    items: slice.map((u) => ({
      id: u.id,
      name: u.name,
      roleName: roleName(u.role),
      location: u.location,
      photoUrl: u.photoUrl,
      isVerified: u.isVerified,
      products: productMap.get(u.id) ?? 0,
      deliveriesTogether: together.get(u.id) ?? 0,
      areas: agentAreas.get(u.id) ?? [],
    })),
  };
}
