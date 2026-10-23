import { prisma } from "../lib/prisma";
import { findRegion } from "../lib/ngoRegions";
import { clean, clientScope, normalizeProduct, peopleMap, plain } from "../lib/agentScope";
import { assertAgent, requireApproved } from "./agentService";

const PAGE_SIZE = 20;
const LOW_STOCK = 5;
const DAY = 86400000;

export async function listProducts(
  agentId: string,
  role: string | undefined,
  filters: {
    q?: string;
    department?: string;
    subcategory?: string;
    region?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    scope?: string;
    availability?: string;
    page?: number;
  }
) {
  assertAgent(role);
  const scope = await clientScope(agentId);
  const mine = filters.scope === "mine";

  const empty = { total: 0, page: 1, pageSize: PAGE_SIZE, summary: { total: 0, available: 0, unavailable: 0, lowStock: 0 }, byDepartment: {} as Record<string, number>, items: [] as any[] };
  if (mine && scope.ids.length === 0) return empty;

  const where: any = mine ? { ownerId: { in: scope.ids } } : { isAvailable: true };
  const rows: any[] = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, take: 900 });

  const owners = await peopleMap(rows.map((p) => p.ownerId), scope);
  const needle = plain(filters.q);
  const subWanted = plain(filters.subcategory);

  let items = rows.map((raw) => {
    const p = normalizeProduct(raw);
    const owner = owners.get(p.ownerId) ?? null;
    const regionKey = findRegion(p.location)?.key ?? findRegion(owner?.location)?.key ?? null;
    return { ...p, owner, regionKey, lowStock: p.isAvailable && p.stock !== null && p.stock <= LOW_STOCK };
  });

  const summary = {
    total: items.length,
    available: items.filter((p) => p.isAvailable).length,
    unavailable: items.filter((p) => !p.isAvailable).length,
    lowStock: items.filter((p) => p.lowStock).length,
  };

  items = items
    .filter((p) => !filters.region || p.regionKey === filters.region)
    .filter((p) => !needle || plain(`${p.title} ${p.description} ${p.subcategory} ${p.location} ${p.owner?.name}`).includes(needle))
    .filter((p) => !subWanted || plain(p.subcategory).includes(subWanted))
    .filter((p) => filters.minPrice === undefined || (p.price !== null && p.price >= filters.minPrice))
    .filter((p) => filters.maxPrice === undefined || (p.price !== null && p.price <= filters.maxPrice));

  if (mine) {
    if (filters.availability === "unavailable") items = items.filter((p) => !p.isAvailable);
    else if (filters.availability === "low") items = items.filter((p) => p.lowStock);
    else if (filters.availability === "available") items = items.filter((p) => p.isAvailable);
  }

  const byDepartment: Record<string, number> = {};
  items.forEach((p) => {
    const key = p.department ?? "OUTRO";
    byDepartment[key] = (byDepartment[key] ?? 0) + 1;
  });

  if (filters.department) items = items.filter((p) => (p.department ?? "OUTRO") === filters.department);

  if (filters.sort === "PRECO_ASC") items.sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
  else if (filters.sort === "PRECO_DESC") items.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));

  const total = items.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    summary,
    byDepartment,
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function getProduct(agentId: string, role: string | undefined, id: string) {
  assertAgent(role);
  const scope = await clientScope(agentId);

  const raw: any = await prisma.product.findUnique({ where: { id } });
  if (!raw || (raw.isAvailable === false && !scope.set.has(raw.ownerId))) {
    throw new Error("Produto não encontrado.");
  }

  const owners = await peopleMap([raw.ownerId], scope);
  const p = normalizeProduct(raw);
  const owner = owners.get(p.ownerId) ?? null;

  return {
    ...p,
    owner,
    regionKey: findRegion(p.location)?.key ?? findRegion(owner?.location)?.key ?? null,
    lowStock: p.isAvailable && p.stock !== null && p.stock <= LOW_STOCK,
  };
}

// Produtos de um cliente, com a disponibilidade
export async function clientProducts(agentId: string, role: string | undefined, linkId: string) {
  assertAgent(role);

  const link = await prisma.agentClient.findUnique({ where: { id: linkId } });
  if (!link || link.agentId !== agentId) {
    throw new Error("Cliente não encontrado.");
  }

  const rows: any[] = await prisma.product.findMany({ where: { ownerId: link.clientId }, orderBy: { createdAt: "desc" }, take: 300 });
  const items = rows.map((raw) => {
    const p = normalizeProduct(raw);
    return { ...p, lowStock: p.isAvailable && p.stock !== null && p.stock <= LOW_STOCK };
  });

  return {
    summary: {
      total: items.length,
      available: items.filter((p) => p.isAvailable).length,
      unavailable: items.filter((p) => !p.isAvailable).length,
      lowStock: items.filter((p) => p.lowStock).length,
    },
    items,
  };
}

// Ajudar o cliente a encontrar produtos: o agente sugere-lhe um produto
export async function suggestProduct(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await requireApproved(agentId);

  const raw: any = await prisma.product.findUnique({ where: { id: String(input?.productId ?? "") } });
  if (!raw || raw.isAvailable === false) {
    throw new Error("Produto não encontrado ou indisponível.");
  }
  const product = normalizeProduct(raw);

  const linkIds: string[] = Array.isArray(input?.linkIds) ? (Array.from(new Set(input.linkIds.map(String))).slice(0, 50) as string[]) : [];
  if (linkIds.length === 0) {
    throw new Error("Escolha pelo menos uma pessoa.");
  }

  const links = await prisma.agentClient.findMany({ where: { id: { in: linkIds }, agentId, status: "ATIVO" } });
  const clientIds = links.map((l) => l.clientId).filter((id) => id !== product.ownerId);
  if (clientIds.length === 0) {
    throw new Error("Escolha clientes ativos da sua carteira (que não sejam o vendedor).");
  }

  const recent = await prisma.agentActivity.findMany({
    where: { agentId, kind: "ATENDIMENTO", relatedId: product.id, clientId: { in: clientIds }, createdAt: { gte: new Date(Date.now() - 7 * DAY) } },
    select: { clientId: true },
  });
  const skip = new Set(recent.map((r) => r.clientId));
  const fresh = clientIds.filter((id) => !skip.has(id));
  if (fresh.length === 0) {
    throw new Error("Já sugeriu este produto a estas pessoas esta semana.");
  }

  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  const note = clean(input?.message, 200);
  const price = product.price !== null ? ` por ${product.price} FCFA${product.unit ? `/${product.unit}` : ""}` : "";

  await prisma.notification.createMany({
    data: fresh.map((userId) => ({
      userId,
      type: "SISTEMA" as const,
      title: "O seu agente sugeriu-lhe um produto",
      message: `${agent?.name ?? "O seu agente"} sugeriu: ${product.title}${price}${note ? `. ${note}` : ""}`.slice(0, 300),
      relatedId: product.id,
    })),
  });
  await prisma.agentActivity.createMany({
    data: fresh.map((clientId) => ({
      agentId,
      clientId,
      kind: "ATENDIMENTO",
      message: `Produto sugerido: ${product.title}`,
      relatedId: product.id,
    })),
  });

  return { sent: fresh.length, skipped: clientIds.length - fresh.length, title: product.title };
}
