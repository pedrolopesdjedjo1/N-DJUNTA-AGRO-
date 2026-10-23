import { prisma } from "../lib/prisma";
import { findRegion } from "../lib/ngoRegions";
import { deliveryClosed, stageOf } from "../lib/agentOpsCatalog";
import { ClientScope, clientScope, loadClientOrders, peopleMap, plain, safe } from "../lib/agentScope";
import { assertAgent } from "./agentService";

const PAGE_SIZE = 30;
const STALE_HOURS = 6;

// =====================================================================
// Encontrar transportadores (telefone só se for cliente do agente)
// =====================================================================
export async function listTransporters(
  agentId: string,
  role: string | undefined,
  filters: { region?: string; q?: string; scope?: string; page?: number }
) {
  assertAgent(role);
  const scope = await clientScope(agentId);

  const users = await prisma.user.findMany({
    where: { role: "TRANSPORTADOR" as any, isActive: true },
    select: { id: true, name: true, location: true, isVerified: true, photoUrl: true, phone: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const needle = plain(filters.q);
  let list = users
    .map((u) => ({ ...u, regionKey: findRegion(u.location)?.key ?? null }))
    .filter((u) => !filters.region || u.regionKey === filters.region)
    .filter((u) => !needle || plain(`${u.name} ${u.location}`).includes(needle));

  if (filters.scope === "mine") list = list.filter((u) => scope.set.has(u.id));
  list.sort((a, b) => Number(b.isVerified) - Number(a.isVerified) || a.name.localeCompare(b.name));

  const total = list.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ids = slice.map((u) => u.id);

  const [ratings, deliveries] = ids.length
    ? await Promise.all([
        safe(
          "avaliações dos transportadores",
          () => prisma.review.groupBy({ by: ["targetId"], where: { targetId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } }),
          [] as any[]
        ),
        safe(
          "entregas dos transportadores",
          () => (prisma.delivery as any).groupBy({ by: ["transporterId"], where: { transporterId: { in: ids } }, _count: { _all: true } }),
          [] as any[]
        ),
      ])
    : [[], []];

  const ratingMap = new Map((ratings as any[]).map((r) => [r.targetId, r]));
  const deliveryMap = new Map((deliveries as any[]).map((d) => [d.transporterId, d._count._all]));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    items: slice.map((u) => {
      const r = ratingMap.get(u.id);
      const isClient = scope.set.has(u.id);
      return {
        id: u.id,
        name: u.name,
        location: u.location,
        regionKey: u.regionKey,
        isVerified: u.isVerified,
        photoUrl: u.photoUrl,
        isClient,
        linkId: scope.linkByClient.get(u.id) ?? null,
        phone: isClient ? u.phone ?? null : null,
        rating: r?._avg?.rating ? Math.round(r._avg.rating * 10) / 10 : null,
        ratingCount: r?._count?._all ?? 0,
        deliveries: deliveryMap.get(u.id) ?? 0,
      };
    }),
  };
}

function shapeDelivery(d: any, order: any, people: Map<string, any>, transporters: Map<string, any>, scope: ClientScope) {
  const closed = deliveryClosed(d.status) || ["CONCLUIDA", "CANCELADA", "ENTREGUE"].includes(stageOf(order?.status));
  const at = d.lastLocationAt ? new Date(d.lastLocationAt).getTime() : null;
  const minutes = at ? Math.max(0, Math.floor((Date.now() - at) / 60000)) : null;
  const transporter = d.transporterId ? transporters.get(d.transporterId) ?? null : null;

  return {
    id: d.id,
    orderId: d.orderId,
    status: d.status ? String(d.status) : null,
    closed,
    createdAt: d.createdAt ?? null,
    lastLocation: d.lastLocation ?? null,
    lastLat: d.lastLat ?? null,
    lastLng: d.lastLng ?? null,
    lastLocationAt: d.lastLocationAt ?? null,
    minutesSinceLocation: minutes,
    stale: !closed && minutes !== null && minutes > STALE_HOURS * 60,
    noTransporter: !closed && !d.transporterId,
    transporter: transporter
      ? {
          id: transporter.id,
          name: transporter.name,
          isVerified: transporter.isVerified,
          phone: scope.set.has(transporter.id) ? transporter.phone : null,
        }
      : null,
    order: order
      ? {
          id: order.id,
          status: String(order.status),
          stage: stageOf(order.status),
          total: Number(order.total) || 0,
          buyer: people.get(order.buyerId) ?? null,
          seller: people.get(order.sellerId) ?? null,
        }
      : null,
  };
}

async function loadDeliveries(scope: ClientScope, orders: any[]) {
  if (orders.length === 0) return [] as any[];
  const rows = await safe(
    "entregas dos clientes",
    async () => (await prisma.delivery.findMany({ where: { orderId: { in: orders.map((o) => o.id) } } })) as any[],
    [] as any[]
  );
  return rows;
}

// =====================================================================
// Acompanhar entregas e ver a localização
// =====================================================================
export async function listDeliveries(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; linkId?: string; attention?: boolean }
) {
  assertAgent(role);
  const scope = await clientScope(agentId);
  const orders = await loadClientOrders(scope.ids, 600);
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const rows = await loadDeliveries(scope, orders);

  const people = await peopleMap(
    orders.flatMap((o) => [o.buyerId, o.sellerId]),
    scope
  );
  const transporterIds = Array.from(new Set(rows.map((d) => d.transporterId).filter(Boolean))) as string[];
  const transporterUsers = transporterIds.length
    ? await prisma.user.findMany({ where: { id: { in: transporterIds } }, select: { id: true, name: true, isVerified: true, phone: true } })
    : [];
  const transporters = new Map(transporterUsers.map((t) => [t.id, t]));

  let items = rows.map((d) => shapeDelivery(d, orderMap.get(d.orderId), people, transporters, scope));

  const counts = {
    active: items.filter((i) => !i.closed).length,
    attention: items.filter((i) => !i.closed && (i.stale || i.noTransporter)).length,
    done: items.filter((i) => i.closed).length,
    total: items.length,
  };

  const wanted = filters.status ?? "active";
  if (wanted === "active") items = items.filter((i) => !i.closed);
  else if (wanted === "done") items = items.filter((i) => i.closed);

  if (filters.attention) items = items.filter((i) => !i.closed && (i.stale || i.noTransporter));
  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) throw new Error("Cliente não encontrado.");
    items = items.filter((i) => i.order?.buyer?.id === link.clientId || i.order?.seller?.id === link.clientId);
  }

  items.sort((a, b) => {
    const aa = Number(a.stale || a.noTransporter);
    const bb = Number(b.stale || b.noTransporter);
    return bb - aa || new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  return { counts, items: items.slice(0, 100) };
}

export async function getDelivery(agentId: string, role: string | undefined, id: string) {
  assertAgent(role);
  const scope = await clientScope(agentId);

  const d: any = await prisma.delivery.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Entrega não encontrada.");
  }
  const order: any = await prisma.order.findUnique({ where: { id: d.orderId } });
  if (!order || (!scope.set.has(order.buyerId) && !scope.set.has(order.sellerId))) {
    throw new Error("Entrega não encontrada.");
  }

  const people = await peopleMap([order.buyerId, order.sellerId], scope);
  const transporterUsers = d.transporterId
    ? await prisma.user.findMany({ where: { id: String(d.transporterId) }, select: { id: true, name: true, isVerified: true, phone: true } })
    : [];
  const transporters = new Map(transporterUsers.map((t) => [t.id, t]));

  return shapeDelivery(d, order, people, transporters, scope);
}
