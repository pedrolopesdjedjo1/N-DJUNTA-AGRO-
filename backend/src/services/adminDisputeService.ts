import { prisma } from "../lib/prisma";
import { stageOf } from "../lib/agentOpsCatalog";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { roleName } from "../lib/adminUserCatalog";
import { DISPUTE_DECISIONS, DISPUTE_REASONS } from "../lib/adminOpsCatalog";
import { AdminSnapshot, loadAdmin } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const OPEN = ["ABERTA", "EM_ANALISE"];
const DAY = 86400000;
const REASON_VALUES = values(DISPUTE_REASONS);
const DECISION_VALUES = values(DISPUTE_DECISIONS);
const PUBLIC_KINDS = ["ABERTURA", "MENSAGEM", "MENSAGEM_EQUIPA", "DECISAO"];

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

async function addEvent(disputeId: string, authorId: string, kind: string, message?: string | null) {
  await prisma.orderDisputeEvent.create({ data: { disputeId, authorId, kind, message: message ?? null } });
}

async function reviewerIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const snaps = await Promise.all(admins.map((a) => loadAdmin(a.id)));
  return snaps.filter((s) => s && s.status === "ATIVO" && s.permissions.has("orders.manage")).map((s) => (s as AdminSnapshot).userId);
}

async function notify(ids: (string | null | undefined)[], title: string, message: string, relatedId: string) {
  const list = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (list.length === 0) return;
  await prisma.notification.createMany({ data: list.map((userId) => ({ userId, type: "SISTEMA" as const, title, message: message.slice(0, 300), relatedId })) });
}

// =====================================================================
// Do lado das pessoas: abrir e acompanhar uma disputa
// =====================================================================
export async function openDispute(userId: string, input: any) {
  const orderId = String(input?.orderId ?? "");
  const o: any = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
  if (!o) {
    throw new Error("Encomenda não encontrada.");
  }
  if (o.buyerId !== userId && o.sellerId !== userId) {
    throw new Error("Só pode abrir uma disputa numa encomenda em que participa.");
  }

  const stage = stageOf(o.status);
  if (stage === "NOVA" || stage === "CANCELADA") {
    throw new Error("Só se pode abrir uma disputa depois de a encomenda ser confirmada e enquanto não estiver cancelada.");
  }
  if ((stage === "CONCLUIDA" || stage === "ENTREGUE") && Date.now() - new Date(o.updatedAt).getTime() > 30 * DAY) {
    throw new Error("O prazo de 30 dias para abrir uma disputa já passou. Fale com o suporte.");
  }

  const reason = String(input?.reason ?? "");
  if (!REASON_VALUES.includes(reason)) {
    throw new Error("Escolha o problema.");
  }
  const description = clean(input?.description, 1000);
  if (!description || description.length < 10) {
    throw new Error("Explique o que aconteceu (pelo menos 10 letras).");
  }

  const open = await prisma.orderDispute.findFirst({ where: { orderId, status: { in: OPEN } } });
  if (open) {
    throw new Error("Já existe uma disputa aberta para esta encomenda.");
  }

  const againstId = o.buyerId === userId ? o.sellerId : o.buyerId;
  const dispute = await prisma.orderDispute.create({ data: { orderId, openedBy: userId, againstId, reason, description } });
  await addEvent(dispute.id, userId, "ABERTURA", description);

  const opener = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify([againstId], "Foi aberta uma disputa", `${opener?.name ?? "A outra parte"} abriu uma disputa sobre a encomenda ${shortId(orderId)}. Pode responder no app.`, dispute.id);
  await notify(await reviewerIds(), "Nova disputa de encomenda", `Encomenda ${shortId(orderId)}: ${DISPUTE_REASONS.find((r) => r.value === reason)?.label}.`, dispute.id);

  return { id: dispute.id, status: dispute.status };
}

async function participantDispute(userId: string, id: string) {
  const d = await prisma.orderDispute.findUnique({ where: { id } });
  if (!d || (d.openedBy !== userId && d.againstId !== userId)) {
    throw new Error("Disputa não encontrada.");
  }
  return d;
}

export async function replyDispute(userId: string, id: string, messageInput: any) {
  const d = await participantDispute(userId, id);
  if (d.status === "RESOLVIDA") {
    throw new Error("Esta disputa já foi decidida.");
  }
  const message = clean(messageInput, 1000);
  if (!message || message.length < 3) {
    throw new Error("Escreva a mensagem.");
  }

  await addEvent(id, userId, "MENSAGEM", message);

  const other = d.openedBy === userId ? d.againstId : d.openedBy;
  const target = d.assignedTo ? [d.assignedTo] : await reviewerIds();
  await notify([other], "Nova mensagem na disputa", `Encomenda ${shortId(d.orderId)}: ${message.slice(0, 100)}`, id);
  await notify(target, "Nova mensagem numa disputa", `Encomenda ${shortId(d.orderId)}.`, id);

  return myDispute(userId, id);
}

export async function myDisputes(userId: string) {
  const rows = await prisma.orderDispute.findMany({ where: { OR: [{ openedBy: userId }, { againstId: userId }] }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((d) => ({
    id: d.id,
    orderId: d.orderId,
    orderCode: shortId(d.orderId),
    reason: d.reason,
    status: d.status,
    mine: d.openedBy === userId,
    decision: d.decision,
    createdAt: d.createdAt,
    decidedAt: d.decidedAt,
  }));
}

export async function myDispute(userId: string, id: string) {
  const d = await participantDispute(userId, id);
  const events = await prisma.orderDisputeEvent.findMany({ where: { disputeId: id, kind: { in: PUBLIC_KINDS } }, orderBy: { createdAt: "asc" }, take: 100 });
  const authors = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(events.map((e) => e.authorId))) } }, select: { id: true, name: true } });
  const names = new Map(authors.map((a) => [a.id, a.name]));

  return {
    dispute: {
      id: d.id,
      orderId: d.orderId,
      orderCode: shortId(d.orderId),
      reason: d.reason,
      description: d.description,
      status: d.status,
      mine: d.openedBy === userId,
      decision: d.decision,
      decisionNote: d.decisionNote,
      refundAmount: d.refundAmount,
      createdAt: d.createdAt,
      decidedAt: d.decidedAt,
    },
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      message: e.message,
      createdAt: e.createdAt,
      authorName: e.kind === "MENSAGEM_EQUIPA" || e.kind === "DECISAO" ? "Equipa NÔDJUNTA AGRO" : e.authorId === userId ? "Você" : names.get(e.authorId) ?? "A outra parte",
      fromTeam: e.kind === "MENSAGEM_EQUIPA" || e.kind === "DECISAO",
    })),
    canReply: d.status !== "RESOLVIDA",
  };
}

// =====================================================================
// Equipa: analisar as disputas
// =====================================================================
export async function listDisputes(admin: AdminSnapshot, filters: { status?: string; reason?: string; assigned?: string; q?: string; page?: number }) {
  const where: any = {};
  if (filters.status === "ALL") {
    // todas
  } else if (filters.status === "ABERTA" || filters.status === "EM_ANALISE" || filters.status === "RESOLVIDA") where.status = filters.status;
  else where.status = { in: OPEN };

  if (filters.reason && REASON_VALUES.includes(filters.reason)) where.reason = filters.reason;
  if (filters.assigned === "me") where.assignedTo = admin.userId;
  if (filters.assigned === "none") where.assignedTo = null;
  if (filters.q) where.OR = [{ description: { contains: filters.q, mode: "insensitive" } }, { orderId: { endsWith: filters.q.replace(/^#/, "").toLowerCase() } }];

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows, groups] = await Promise.all([
    prisma.orderDispute.count({ where }),
    prisma.orderDispute.findMany({ where, orderBy: { createdAt: where.status === "RESOLVIDA" ? "desc" : "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.orderDispute.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const ids = Array.from(new Set(rows.flatMap((r) => [r.openedBy, r.againstId, r.assignedTo]).filter(Boolean))) as string[];
  const orders: any[] = rows.length ? await prisma.order.findMany({ where: { id: { in: rows.map((r) => r.orderId) } }, select: { id: true, total: true, status: true } }) : [];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  return {
    counts,
    total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderCode: shortId(r.orderId),
      orderTotal: orderMap.get(r.orderId) ? Number(orderMap.get(r.orderId).total) || 0 : null,
      reason: r.reason,
      description: r.description,
      status: r.status,
      ageDays: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / DAY),
      openedBy: { id: r.openedBy, name: names.get(r.openedBy) ?? "Utilizador" },
      against: r.againstId ? { id: r.againstId, name: names.get(r.againstId) ?? "Utilizador" } : null,
      assignedTo: r.assignedTo ? { id: r.assignedTo, name: names.get(r.assignedTo) ?? "Administrador" } : null,
      decision: r.decision,
      createdAt: r.createdAt,
    })),
  };
}

export async function getDispute(id: string) {
  const d = await prisma.orderDispute.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Disputa não encontrada.");
  }

  const [events, order, previous] = await Promise.all([
    prisma.orderDisputeEvent.findMany({ where: { disputeId: id }, orderBy: { createdAt: "asc" }, take: 150 }),
    prisma.order.findUnique({ where: { id: d.orderId } }) as Promise<any>,
    d.againstId ? prisma.orderDispute.count({ where: { againstId: d.againstId, id: { not: id } } }) : Promise.resolve(0),
  ]);

  const peopleIds = Array.from(new Set([d.openedBy, d.againstId, d.assignedTo, d.decidedBy, ...events.map((e) => e.authorId)].filter(Boolean))) as string[];
  const users = await prisma.user.findMany({ where: { id: { in: peopleIds } }, select: { id: true, name: true, phone: true, role: true } });
  const people = new Map(users.map((u) => [u.id, { ...u, roleName: roleName(u.role) }]));

  const payments: any[] = order ? await prisma.orderPayment.findMany({ where: { orderId: d.orderId } }) : [];

  return {
    dispute: {
      ...d,
      orderCode: shortId(d.orderId),
      assignedName: d.assignedTo ? people.get(d.assignedTo)?.name ?? "Administrador" : null,
      decidedName: d.decidedBy ? people.get(d.decidedBy)?.name ?? "Administrador" : null,
    },
    order: order ? { id: order.id, total: Number(order.total) || 0, shippingCost: order.shippingCost ?? null, status: String(order.status), stage: stageOf(order.status) } : null,
    payments: payments.map((p) => ({ amount: p.amount ?? null, method: p.method ?? null, status: p.status ?? null, reference: p.reference ?? null })),
    openedBy: people.get(d.openedBy) ?? null,
    against: d.againstId ? people.get(d.againstId) ?? null : null,
    otherDisputesAgainst: previous,
    events: events.map((e) => ({ ...e, authorName: people.get(e.authorId)?.name ?? "Utilizador", internal: !PUBLIC_KINDS.includes(e.kind) })),
    canDecide: OPEN.includes(d.status),
  };
}

export async function assignDispute(admin: AdminSnapshot, id: string) {
  const d = await prisma.orderDispute.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Disputa não encontrada.");
  }
  if (!OPEN.includes(d.status)) {
    throw new Error("Esta disputa já foi decidida.");
  }

  await prisma.orderDispute.update({ where: { id }, data: { assignedTo: admin.userId, status: "EM_ANALISE" } });
  await addEvent(id, admin.userId, "ATRIBUIDA", `${admin.name} assumiu esta disputa.`);
  await notify([d.openedBy, d.againstId], "A sua disputa está a ser analisada", `A equipa assumiu a disputa da encomenda ${shortId(d.orderId)}.`, id);
  await logAudit(admin.userId, "DISPUTE_ASSIGN", { type: "DISPUTE", id }, `Assumiu a disputa da encomenda ${shortId(d.orderId)}`);

  return getDispute(id);
}

export async function noteDispute(admin: AdminSnapshot, id: string, messageInput: any) {
  const d = await prisma.orderDispute.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Disputa não encontrada.");
  }
  const message = clean(messageInput, 500);
  if (!message || message.length < 3) {
    throw new Error("Escreva a nota.");
  }

  await addEvent(id, admin.userId, "NOTA", message);
  return getDispute(id);
}

// Mensagem da equipa que as duas partes veem
export async function messageDispute(admin: AdminSnapshot, id: string, messageInput: any) {
  const d = await prisma.orderDispute.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Disputa não encontrada.");
  }
  if (!OPEN.includes(d.status)) {
    throw new Error("Esta disputa já foi decidida.");
  }
  const message = clean(messageInput, 1000);
  if (!message || message.length < 5) {
    throw new Error("Escreva a mensagem (pelo menos 5 letras).");
  }

  await addEvent(id, admin.userId, "MENSAGEM_EQUIPA", message);
  await notify([d.openedBy, d.againstId], "Mensagem da equipa sobre a disputa", message.slice(0, 120), id);
  await logAudit(admin.userId, "DISPUTE_MESSAGE", { type: "DISPUTE", id }, `Escreveu na disputa da encomenda ${shortId(d.orderId)}`);

  return getDispute(id);
}

export async function resolveDispute(admin: AdminSnapshot, id: string, input: any) {
  const d = await prisma.orderDispute.findUnique({ where: { id } });
  if (!d) {
    throw new Error("Disputa não encontrada.");
  }
  if (!OPEN.includes(d.status)) {
    throw new Error("Esta disputa já foi decidida.");
  }

  const decision = String(input?.decision ?? "");
  if (!DECISION_VALUES.includes(decision)) {
    throw new Error("Escolha a decisão.");
  }
  const note = clean(input?.note, 500);
  if (!note || note.length < 5) {
    throw new Error("Explique a decisão (pelo menos 5 letras). As duas partes veem esta explicação.");
  }

  let refund: number | null = null;
  if (input?.refundAmount !== undefined && input.refundAmount !== null && input.refundAmount !== "") {
    if (decision !== "FAVOR_COMPRADOR") {
      throw new Error("O valor a devolver só se indica quando a decisão é a favor do comprador.");
    }
    const order: any = await prisma.order.findUnique({ where: { id: d.orderId }, select: { total: true } });
    refund = Number(String(input.refundAmount).replace(",", "."));
    if (isNaN(refund) || refund <= 0 || (order && refund > Number(order.total))) {
      throw new Error("O valor a devolver deve ser maior que zero e não pode passar o valor da encomenda.");
    }
  }

  const label = DISPUTE_DECISIONS.find((x) => x.value === decision)?.label ?? decision;
  await prisma.orderDispute.update({
    where: { id },
    data: { status: "RESOLVIDA", decision, decisionNote: note, refundAmount: refund, decidedBy: admin.userId, decidedAt: new Date() },
  });
  await addEvent(id, admin.userId, "DECISAO", `${label}${refund ? ` (devolução de ${refund} FCFA)` : ""}: ${note}`);

  await notify(
    [d.openedBy, d.againstId],
    "A disputa foi decidida",
    `Encomenda ${shortId(d.orderId)}: ${label}.${refund ? ` Devolução de ${refund} FCFA.` : ""} ${note}`,
    id
  );
  await logAudit(admin.userId, "DISPUTE_RESOLVE", { type: "DISPUTE", id }, `Decidiu a disputa da encomenda ${shortId(d.orderId)}: ${label}`, { decision, refund });

  return getDispute(id);
}
