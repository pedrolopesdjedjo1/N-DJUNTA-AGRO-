import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { BUYER_ROLES } from "../lib/adminUserCatalog";
import { CONTACT_VIA, DIRECTORY_KINDS } from "../lib/transportBusinessCatalog";
import { assertTransporter, ensureProfile } from "./transporterService";
import { loadMineCards } from "./transportDeliveryService";

const PAGE_SIZE = 25;
const VIA_VALUES = values(CONTACT_VIA);

// =====================================================================
// As pessoas com quem trabalhou (compradores e vendedores das suas entregas)
// =====================================================================
export async function listContacts(userId: string, role: string | undefined, filters: { kind?: string; q?: string }) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  const cards = await loadMineCards(userId, profile);

  const people = new Map<string, any>();
  cards
    .filter((c) => c.phase !== "CANCELADA")
    .forEach((c) => {
      [
        { p: c.buyer, relation: "BUYER" },
        { p: c.seller, relation: "SELLER" },
      ].forEach(({ p, relation }) => {
        if (!p?.id) return;
        const row = people.get(p.id) ?? {
          id: p.id,
          name: p.name,
          location: p.location,
          photoUrl: p.photoUrl,
          phone: p.phone,
          isVerified: p.isVerified,
          relations: new Set<string>(),
          deliveries: 0,
          lastAt: null as any,
          lastOrderCode: null as any,
        };
        row.relations.add(relation);
        row.deliveries += 1;
        const at = c.deliveredAt ?? c.createdAt;
        if (!row.lastAt || new Date(at).getTime() > new Date(row.lastAt).getTime()) {
          row.lastAt = at;
          row.lastOrderCode = c.orderCode;
        }
        people.set(p.id, row);
      });
    });

  const logs = people.size
    ? await prisma.contactLog.groupBy({ by: ["targetId"], where: { userId, targetId: { in: Array.from(people.keys()) } }, _count: { _all: true }, _max: { createdAt: true } })
    : [];
  const logMap = new Map(logs.map((l) => [l.targetId, l]));

  const needle = plain(filters.q);
  let items = Array.from(people.values()).map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location,
    photoUrl: p.photoUrl,
    phone: p.phone,
    isVerified: p.isVerified,
    relations: Array.from(p.relations) as string[],
    deliveries: p.deliveries,
    lastDeliveryAt: p.lastAt,
    lastOrderCode: p.lastOrderCode,
    contacts: logMap.get(p.id)?._count._all ?? 0,
    lastContactAt: logMap.get(p.id)?._max.createdAt ?? null,
  }));

  if (filters.kind === "BUYER" || filters.kind === "SELLER") items = items.filter((p) => p.relations.includes(filters.kind as string));
  if (needle) items = items.filter((p) => plain(`${p.name} ${p.location}`).includes(needle));
  items.sort((a, b) => new Date(b.lastDeliveryAt ?? 0).getTime() - new Date(a.lastDeliveryAt ?? 0).getTime());

  return { total: items.length, items };
}

// Regista que ligou, escreveu ou abriu o WhatsApp a uma pessoa (para o histórico de contactos)
export async function logContact(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);

  const targetId = String(input?.targetId ?? "");
  const via = String(input?.via ?? "");
  if (!targetId || !VIA_VALUES.includes(via)) {
    throw new Error("Contacto inválido.");
  }

  const mine: any[] = await prisma.delivery.findMany({ where: { transporterId: userId }, select: { id: true, orderId: true }, take: 500 });
  const orderIds = mine.map((m) => m.orderId).filter(Boolean);
  const related = orderIds.length ? await prisma.order.count({ where: { id: { in: orderIds }, OR: [{ buyerId: targetId }, { sellerId: targetId }] } }) : 0;
  if (related === 0) {
    throw new Error("Só se registam contactos de pessoas com quem trabalhou.");
  }

  const today = await prisma.contactLog.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 86400000) } } });
  if (today >= 200) {
    return { logged: false };
  }

  let deliveryId: string | null = null;
  if (input?.deliveryId && mine.some((m) => m.id === String(input.deliveryId))) deliveryId = String(input.deliveryId);

  await prisma.contactLog.create({ data: { userId, targetId, deliveryId, via } });
  return { logged: true };
}

export async function contactHistory(userId: string, role: string | undefined, targetId: string) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [logs, cards, user] = await Promise.all([
    prisma.contactLog.findMany({ where: { userId, targetId }, orderBy: { createdAt: "desc" }, take: 50 }),
    loadMineCards(userId, profile),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true, location: true } }),
  ]);

  const shared = cards.filter((c) => c.buyer?.id === targetId || c.seller?.id === targetId);
  if (!user || shared.length === 0) {
    throw new Error("Contacto não encontrado.");
  }

  return {
    person: user,
    logs: logs.map((l) => ({ id: l.id, via: l.via, deliveryId: l.deliveryId, createdAt: l.createdAt })),
    deliveries: shared.map((c) => ({ id: c.id, orderCode: c.orderCode, phase: c.phase, createdAt: c.createdAt, deliveredAt: c.deliveredAt, relation: c.buyer?.id === targetId ? "BUYER" : "SELLER" })),
  };
}

// =====================================================================
// Procurar agricultores, pescadores, artesãos, comerciantes, compradores e agentes
// (sem telefones: o contacto faz-se pelas mensagens do app)
// =====================================================================
export async function directory(userId: string, role: string | undefined, filters: { kind?: string; region?: string; q?: string; page?: number }) {
  assertTransporter(role);

  const def = DIRECTORY_KINDS.find((k) => k.value === filters.kind) ?? DIRECTORY_KINDS[0];
  const roles = def.roles === "BUYER" ? BUYER_ROLES : def.roles;

  const where: any = { isActive: true, role: { in: roles as any }, id: { not: userId } };
  const region = filters.region ? REGIONS.find((r) => r.key === filters.region) : null;
  const and: any[] = [];
  if (region) and.push({ location: { contains: region.name, mode: "insensitive" } });
  const q = String(filters.q ?? "").trim();
  if (q) and.push({ OR: [{ name: { contains: q, mode: "insensitive" } }, { location: { contains: q, mode: "insensitive" } }] });
  if (and.length > 0) where.AND = and;

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, location: true, photoUrl: true, isVerified: true },
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const ids = rows.map((r) => r.id);
  const [products, agents] = ids.length
    ? await Promise.all([
        def.value === "AGENTES" || def.value === "COMPRADORES"
          ? Promise.resolve([] as any[])
          : prisma.product.groupBy({ by: ["ownerId"], where: { ownerId: { in: ids }, isAvailable: true }, _count: { _all: true } }),
        def.value === "AGENTES" ? prisma.agentProfile.findMany({ where: { userId: { in: ids }, status: "APROVADO" } }) : Promise.resolve([] as any[]),
      ])
    : [[], []];
  const productMap = new Map((products as any[]).map((p) => [p.ownerId, p._count._all]));
  const agentMap = new Map((agents as any[]).map((a) => [a.userId, a]));

  const items = rows
    .filter((r) => def.value !== "AGENTES" || agentMap.has(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      role: String(r.role),
      location: r.location,
      photoUrl: r.photoUrl,
      isVerified: r.isVerified,
      products: productMap.get(r.id) ?? null,
      agent: agentMap.get(r.id)
        ? { agentType: agentMap.get(r.id).agentType, areas: agentMap.get(r.id).areas, regions: (agentMap.get(r.id).regions as string[]).map((k) => REGIONS.find((x) => x.key === k)?.name ?? k) }
        : null,
    }));

  return { kind: def.value, total, page, pageSize: PAGE_SIZE, items, note: "Por privacidade, o contacto faz-se pelas mensagens do app." };
}
