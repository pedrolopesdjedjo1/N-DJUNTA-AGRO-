import { prisma } from "../lib/prisma";
import { ORDER_ACTIONS, OPEN_STAGES, stageOf } from "../lib/agentOpsCatalog";
import { ClientScope, clean, clientScope, loadClientOrders, peopleMap, plain, safe } from "../lib/agentScope";
import { assertAgent, requireApproved } from "./agentService";

const DAY = 86400000;
const PAGE_SIZE = 20;

function attentionOf(o: any, stage: string): string | null {
  const now = Date.now();
  const created = new Date(o.createdAt).getTime();
  const updated = new Date(o.updatedAt ?? o.createdAt).getTime();

  if (stage === "NOVA" && now - created > DAY) return "Ainda não foi confirmada";
  if (stage === "ENTREGUE" && !o.buyerConfirmedAt && now - updated > 2 * DAY) return "O comprador ainda não confirmou a receção";
  if (OPEN_STAGES.includes(stage) && now - updated > 3 * DAY) return `Parada há ${Math.floor((now - updated) / DAY)} dias`;
  return null;
}

// Que lado da encomenda pertence a clientes do agente
function sidesOf(o: any, scope: ClientScope) {
  const sides: { side: string; linkId: string | null; clientId: string }[] = [];
  if (scope.set.has(o.buyerId)) sides.push({ side: "COMPRADOR", linkId: scope.linkByClient.get(o.buyerId) ?? null, clientId: o.buyerId });
  if (scope.set.has(o.sellerId)) sides.push({ side: "VENDEDOR", linkId: scope.linkByClient.get(o.sellerId) ?? null, clientId: o.sellerId });
  return sides;
}

function itemShape(i: any) {
  const price = Number(i.price ?? i.unitPrice ?? NaN);
  return {
    id: i.id,
    title: String(i.title ?? "Produto"),
    quantity: Number(i.quantity) || 0,
    unitPrice: isNaN(price) ? null : price,
    unit: i.unit ?? null,
  };
}

function deliveryShape(d: any) {
  return {
    id: d.id,
    status: d.status ? String(d.status) : null,
    transporterId: d.transporterId ?? null,
    lastLocation: d.lastLocation ?? null,
    lastLat: d.lastLat ?? null,
    lastLng: d.lastLng ?? null,
    lastLocationAt: d.lastLocationAt ?? null,
    createdAt: d.createdAt ?? null,
  };
}

// =====================================================================
export async function listOrders(
  agentId: string,
  role: string | undefined,
  filters: { scope?: string; stage?: string; side?: string; linkId?: string; q?: string; attention?: boolean; page?: number }
) {
  assertAgent(role);
  const scope = await clientScope(agentId);
  const rows = await loadClientOrders(scope.ids);
  const people = await peopleMap(
    rows.flatMap((o) => [o.buyerId, o.sellerId]),
    scope
  );

  const all = rows.map((o) => ({ o, stage: stageOf(o.status), attention: null as string | null }));
  all.forEach((x) => (x.attention = attentionOf(x.o, x.stage)));

  const now = Date.now();
  const open = all.filter((x) => OPEN_STAGES.includes(x.stage));
  const byStage: Record<string, number> = {};
  open.forEach((x) => (byStage[x.stage] = (byStage[x.stage] ?? 0) + 1));

  const done30 = all.filter((x) => x.stage === "CONCLUIDA" && now - new Date(x.o.updatedAt ?? x.o.createdAt).getTime() < 30 * DAY);
  const summary = {
    open: open.length,
    attention: open.filter((x) => x.attention).length,
    byStage,
    openValue: Math.round(open.reduce((s, x) => s + (Number(x.o.total) || 0), 0)),
    completed30: done30.length,
    completedValue30: Math.round(done30.reduce((s, x) => s + (Number(x.o.total) || 0), 0)),
    total: all.length,
  };

  let list = all;
  const wanted = filters.scope ?? "open";
  if (wanted === "open") list = list.filter((x) => OPEN_STAGES.includes(x.stage));
  else if (wanted === "closed") list = list.filter((x) => !OPEN_STAGES.includes(x.stage));

  if (filters.stage) list = list.filter((x) => x.stage === filters.stage);
  if (filters.attention) list = list.filter((x) => !!x.attention);
  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) throw new Error("Cliente não encontrado.");
    list = list.filter((x) => x.o.buyerId === link.clientId || x.o.sellerId === link.clientId);
  }
  if (filters.side === "COMPRADOR") list = list.filter((x) => scope.set.has(x.o.buyerId));
  if (filters.side === "VENDEDOR") list = list.filter((x) => scope.set.has(x.o.sellerId));

  const needle = plain(filters.q);
  if (needle) {
    list = list.filter((x) => plain(`${x.o.id} ${people.get(x.o.buyerId)?.name} ${people.get(x.o.sellerId)?.name}`).includes(needle));
  }

  const total = list.length;
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ids = slice.map((x) => x.o.id);

  const [items, deliveries] = ids.length
    ? await Promise.all([
        safe("itens das encomendas", async () => (await prisma.orderItem.findMany({ where: { orderId: { in: ids } } })) as any[], [] as any[]),
        safe("entregas", async () => (await prisma.delivery.findMany({ where: { orderId: { in: ids } } })) as any[], [] as any[]),
      ])
    : [[], []];

  return {
    summary,
    total,
    page,
    pageSize: PAGE_SIZE,
    items: slice.map((x) => {
      const o = x.o;
      const its = (items as any[]).filter((i) => i.orderId === o.id);
      const delivery = (deliveries as any[]).find((d) => d.orderId === o.id);
      return {
        id: o.id,
        status: String(o.status),
        stage: x.stage,
        total: Number(o.total) || 0,
        shippingCost: o.shippingCost ?? null,
        paymentMethod: o.paymentMethod ?? null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt ?? o.createdAt,
        buyer: people.get(o.buyerId) ?? null,
        seller: people.get(o.sellerId) ?? null,
        sides: sidesOf(o, scope),
        itemsCount: its.length,
        itemsPreview: its.slice(0, 2).map((i) => String(i.title ?? "Produto")),
        attention: x.attention,
        delivery: delivery ? deliveryShape(delivery) : null,
      };
    }),
  };
}

async function loadOrder(agentId: string, orderId: string) {
  const scope = await clientScope(agentId);
  const o: any = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o || (!scope.set.has(o.buyerId) && !scope.set.has(o.sellerId))) {
    throw new Error("Encomenda não encontrada.");
  }
  return { o, scope };
}

export async function getOrder(agentId: string, role: string | undefined, orderId: string) {
  assertAgent(role);
  const { o, scope } = await loadOrder(agentId, orderId);
  const stage = stageOf(o.status);

  const [people, items, deliveries, payments, activities, cases] = await Promise.all([
    peopleMap([o.buyerId, o.sellerId], scope),
    safe("itens", async () => (await prisma.orderItem.findMany({ where: { orderId } })) as any[], [] as any[]),
    safe("entregas", async () => (await prisma.delivery.findMany({ where: { orderId } })) as any[], [] as any[]),
    safe("pagamentos", async () => (await prisma.orderPayment.findMany({ where: { orderId } })) as any[], [] as any[]),
    prisma.agentActivity.findMany({
      where: { agentId, relatedId: orderId, kind: { in: ["ENCOMENDA", "TRANSPORTE"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.agentCase.findMany({ where: { agentId, orderId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return {
    order: {
      id: o.id,
      status: String(o.status),
      stage,
      total: Number(o.total) || 0,
      shippingCost: o.shippingCost ?? null,
      paymentMethod: o.paymentMethod ?? null,
      desiredDate: o.desiredDate ?? null,
      buyerConfirmedAt: o.buyerConfirmedAt ?? null,
      groupId: o.groupId ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt ?? o.createdAt,
    },
    buyer: people.get(o.buyerId) ?? null,
    seller: people.get(o.sellerId) ?? null,
    sides: sidesOf(o, scope),
    attention: attentionOf(o, stage),
    items: (items as any[]).map(itemShape),
    deliveries: (deliveries as any[]).map(deliveryShape),
    payments: (payments as any[]).map((p) => ({
      id: p.id,
      amount: p.amount ?? null,
      method: p.method ?? null,
      status: p.status ? String(p.status) : null,
      reference: p.reference ?? null,
      createdAt: p.createdAt ?? null,
    })),
    activities,
    cases,
  };
}

// Registar o que o agente fez numa encomenda (contactos, confirmações, acompanhamento, notas)
export async function logOrderAction(agentId: string, role: string | undefined, orderId: string, input: any) {
  assertAgent(role);
  await requireApproved(agentId);
  const { o, scope } = await loadOrder(agentId, orderId);

  const action = String(input?.action ?? "");
  const def = ORDER_ACTIONS.find((a) => a.value === action);
  if (!def) {
    throw new Error("Escolha o que fez.");
  }

  const extra = clean(input?.message, 400);
  if (action === "NOTA" && (!extra || extra.length < 3)) {
    throw new Error("Escreva a nota.");
  }

  // A atividade fica na ficha do cliente a quem diz respeito
  const sides = sidesOf(o, scope);
  const wantedSide = action.endsWith("COMPRADOR") ? "COMPRADOR" : action.endsWith("VENDEDOR") ? "VENDEDOR" : null;
  const target = sides.find((s) => s.side === wantedSide) ?? sides[0];
  if (!target) {
    throw new Error("Encomenda não encontrada.");
  }

  const transport = action === "ACOMPANHOU_TRANSPORTE" || action === "ACOMPANHOU_ENTREGA";
  await prisma.agentActivity.create({
    data: {
      agentId,
      clientId: target.clientId,
      kind: transport ? "TRANSPORTE" : "ENCOMENDA",
      message: action === "NOTA" ? extra : `${def.label}${extra ? `: ${extra}` : ""}`,
      relatedId: orderId,
      isPrivate: Boolean(input?.isPrivate),
    },
  });

  if (action.startsWith("CONTACTOU") || action.startsWith("CONFIRMOU")) {
    const link = target.linkId;
    if (link) await prisma.agentClient.update({ where: { id: link }, data: { lastContactAt: new Date() } });
  }

  return getOrder(agentId, role, orderId);
}
