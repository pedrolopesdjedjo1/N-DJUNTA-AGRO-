import { prisma } from "../lib/prisma";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { getSetting } from "../lib/platformSettings";
import { stageOf } from "../lib/agentOpsCatalog";
import { anyModel, readAll } from "../lib/anyModel";
import { roleName } from "../lib/adminUserCatalog";
import { TICKET_CATEGORIES, TICKET_STATUS } from "../lib/adminContentCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const DAY = 86400000;
const STATUS_VALUES = values(TICKET_STATUS);
const CATEGORY_VALUES = values(TICKET_CATEGORIES);

function tickets() {
  return anyModel("supportTicket", "supportTickets", "ticket");
}

function classify(t: any): string {
  const text = plain(`${t.kind ?? ""} ${t.type ?? ""} ${t.category ?? ""} ${t.subject ?? t.title ?? ""} ${t.message ?? t.description ?? ""}`);
  if (/(emergencia|sos|urgente)/.test(text)) return "EMERGENCIA";
  if (/(pagament|pagar|dinheiro|reembols|cobranc)/.test(text)) return "PAGAMENTO";
  if (/(encomenda|pedido|entrega|transporte|produto)/.test(text)) return "ENCOMENDA";
  if (/(erro|bug|tecnic|login|senha|palavra-passe|nao abre|nao funciona|aplicacao)/.test(text)) return "TECNICO";
  if (/(reclam|denunc|queixa)/.test(text)) return "RECLAMACAO";
  return "OUTRO";
}

function baseStatus(t: any): string {
  const s = String(t.status ?? "").toUpperCase();
  return s.includes("RESOLV") || s.includes("FECH") || s.includes("CONCLU") ? "RESOLVIDO" : "ABERTO";
}

async function stateMap(ids: string[]) {
  const rows = ids.length ? await prisma.supportTicketState.findMany({ where: { ticketId: { in: ids } } }) : [];
  return new Map(rows.map((r) => [r.ticketId, r]));
}

async function shape(rows: any[]) {
  const ids = rows.map((t) => String(t.id));
  const [states, replies, people] = await Promise.all([
    stateMap(ids),
    ids.length ? prisma.supportReply.findMany({ where: { ticketId: { in: ids } }, orderBy: { createdAt: "asc" } }) : Promise.resolve([] as any[]),
    prisma.user.findMany({
      where: { id: { in: Array.from(new Set(rows.map((t) => String(t.userId ?? t.authorId ?? "")).filter(Boolean))) } },
      select: { id: true, name: true, phone: true, role: true, location: true },
    }),
  ]);
  const userMap = new Map(people.map((u) => [u.id, u]));
  const handlers = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(states.size ? Array.from(states.values()).map((s) => s.assignedTo).filter(Boolean) as string[] : [])) } }, select: { id: true, name: true } });
  const handlerMap = new Map(handlers.map((h) => [h.id, h.name]));

  return rows.map((t) => {
    const id = String(t.id);
    const state = states.get(id);
    const mine = (replies as any[]).filter((r) => r.ticketId === id);
    const status = state?.status ?? baseStatus(t);
    const userId = String(t.userId ?? t.authorId ?? "");
    const first = mine.find((r) => !r.isInternal);
    return {
      id,
      userId: userId || null,
      user: userMap.get(userId) ? { ...userMap.get(userId)!, roleName: roleName(userMap.get(userId)!.role) } : null,
      subject: String(t.subject ?? t.title ?? String(t.message ?? t.description ?? "Sem assunto").slice(0, 60)),
      message: String(t.message ?? t.description ?? ""),
      kind: t.kind ? String(t.kind) : null,
      category: classify(t),
      status,
      assignedTo: state?.assignedTo ? { id: state.assignedTo, name: handlerMap.get(state.assignedTo) ?? "Administrador" } : null,
      replies: mine.filter((r) => !r.isInternal).length,
      createdAt: t.createdAt ?? null,
      ageDays: t.createdAt ? Math.floor((Date.now() - new Date(t.createdAt).getTime()) / DAY) : null,
      firstResponseHours: first && t.createdAt ? Math.round(((new Date(first.createdAt).getTime() - new Date(t.createdAt).getTime()) / 3600000) * 10) / 10 : null,
    };
  });
}

// =====================================================================
// Caixa de entrada e tickets
// =====================================================================
export async function listTickets(admin: AdminSnapshot, filters: { status?: string; category?: string; assigned?: string; q?: string; page?: number }) {
  const model = tickets();
  const raw = await readAll(model, 2000);
  const all = await shape(raw);

  const counts: Record<string, number> = { ABERTO: 0, EM_CURSO: 0, RESOLVIDO: 0 };
  const categories: Record<string, number> = {};
  all.forEach((t) => {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
    if (t.status !== "RESOLVIDO") categories[t.category] = (categories[t.category] ?? 0) + 1;
  });

  const needle = plain(filters.q);
  let list = all;
  if (filters.status === "OPEN") list = list.filter((t) => t.status !== "RESOLVIDO");
  else if (filters.status && STATUS_VALUES.includes(filters.status)) list = list.filter((t) => t.status === filters.status);
  if (filters.category && CATEGORY_VALUES.includes(filters.category)) list = list.filter((t) => t.category === filters.category);
  if (filters.assigned === "me") list = list.filter((t) => t.assignedTo?.id === admin.userId);
  if (filters.assigned === "none") list = list.filter((t) => !t.assignedTo && t.status !== "RESOLVIDO");
  if (needle) list = list.filter((t) => plain(`${t.subject} ${t.message} ${t.user?.name}`).includes(needle));

  // Os mais antigos por responder primeiro; os resolvidos, os mais recentes primeiro
  list.sort((a, b) => (a.status === "RESOLVIDO" ? -1 : 1) * (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) * (a.status === "RESOLVIDO" ? -1 : 1));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    available: !!model,
    counts,
    categories,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function getTicket(id: string) {
  const model = tickets();
  const row = model ? await model.findUnique({ where: { id } }).catch(() => null) : null;
  if (!row) {
    throw new Error("Ticket não encontrado.");
  }

  const [[ticket], replies] = await Promise.all([shape([row]), prisma.supportReply.findMany({ where: { ticketId: id }, orderBy: { createdAt: "asc" }, take: 200 })]);
  const authors = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(replies.map((r) => r.authorId))) } }, select: { id: true, name: true } });
  const names = new Map(authors.map((a) => [a.id, a.name]));

  const userId = ticket.userId;
  const [others, orders, openReports] = userId
    ? await Promise.all([
        readAll(model, 2000).then((rows) => rows.filter((t) => String(t.userId ?? t.authorId ?? "") === userId && String(t.id) !== id).length),
        prisma.order.findMany({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, orderBy: { createdAt: "desc" }, take: 5 }) as Promise<any[]>,
        prisma.contentReport.count({ where: { reportedUserId: userId, status: { in: ["ABERTA", "EM_ANALISE"] } } }),
      ])
    : [0, [] as any[], 0];

  return {
    ticket,
    replies: replies.map((r) => ({ ...r, authorName: names.get(r.authorId) ?? "Equipa" })),
    context: {
      otherTickets: others,
      openReportsAgainst: openReports,
      recentOrders: orders.map((o) => ({ id: o.id, code: `#${String(o.id).slice(-6).toUpperCase()}`, total: Number(o.total) || 0, stage: stageOf(o.status), createdAt: o.createdAt })),
    },
  };
}

async function loadTicket(id: string) {
  const model = tickets();
  const row = model ? await model.findUnique({ where: { id } }).catch(() => null) : null;
  if (!row) {
    throw new Error("Ticket não encontrado.");
  }
  return row;
}

async function setState(id: string, status: string, adminId: string, assign: boolean) {
  const current = await prisma.supportTicketState.findUnique({ where: { ticketId: id } });
  const assignedTo = current?.assignedTo ?? (assign ? adminId : null);

  await prisma.supportTicketState.upsert({
    where: { ticketId: id },
    create: { ticketId: id, status, assignedTo, updatedBy: adminId },
    update: { status, assignedTo, updatedBy: adminId, updatedAt: new Date() },
  });
}

export async function replyTicket(admin: AdminSnapshot, id: string, input: any) {
  const row = await loadTicket(id);
  const message = clean(input?.message, 1000);
  if (!message || message.length < 3) {
    throw new Error("Escreva a resposta.");
  }

  const userId = String(row.userId ?? row.authorId ?? "");
  await prisma.supportReply.create({ data: { ticketId: id, authorId: admin.userId, message, isInternal: false } });
  await setState(id, input?.resolve === true ? "RESOLVIDO" : "EM_CURSO", admin.userId, true);

  if (userId) {
    await prisma.notification.create({
      data: {
        userId,
        type: "SISTEMA",
        title: input?.resolve === true ? "O seu pedido de suporte foi resolvido" : "Resposta do suporte",
        message: message.slice(0, 300),
        relatedId: id,
      },
    });
  }
  await logAudit(admin.userId, "SUPPORT_REPLY", { type: "TICKET", id }, `Respondeu a um ticket de suporte${input?.resolve === true ? " e resolveu" : ""}`);

  return getTicket(id);
}

export async function noteTicket(admin: AdminSnapshot, id: string, messageInput: any) {
  await loadTicket(id);
  const message = clean(messageInput, 1000);
  if (!message || message.length < 3) {
    throw new Error("Escreva a nota.");
  }

  await prisma.supportReply.create({ data: { ticketId: id, authorId: admin.userId, message, isInternal: true } });
  return getTicket(id);
}

export async function statusTicket(admin: AdminSnapshot, id: string, statusInput: any) {
  await loadTicket(id);
  const status = String(statusInput ?? "");
  if (!STATUS_VALUES.includes(status)) {
    throw new Error("Estado inválido.");
  }

  await setState(id, status, admin.userId, status !== "ABERTO");
  await logAudit(admin.userId, "SUPPORT_STATUS", { type: "TICKET", id }, `Mudou um ticket para "${TICKET_STATUS.find((s) => s.value === status)?.label}"`);
  return getTicket(id);
}

export async function assignTicket(admin: AdminSnapshot, id: string) {
  await loadTicket(id);
  const current = await prisma.supportTicketState.findUnique({ where: { ticketId: id } });

  await prisma.supportTicketState.upsert({
    where: { ticketId: id },
    create: { ticketId: id, status: "EM_CURSO", assignedTo: admin.userId, updatedBy: admin.userId },
    update: { assignedTo: admin.userId, status: current?.status === "RESOLVIDO" ? "RESOLVIDO" : "EM_CURSO", updatedBy: admin.userId, updatedAt: new Date() },
  });
  await logAudit(admin.userId, "SUPPORT_ASSIGN", { type: "TICKET", id }, "Assumiu um ticket de suporte");
  return getTicket(id);
}

// =====================================================================
// Histórico de atendimento
// =====================================================================
export async function supportStats() {
  const since = new Date(Date.now() - 30 * DAY);
  const [raw, replies, states] = await Promise.all([
    readAll(tickets(), 2000),
    prisma.supportReply.findMany({ where: { isInternal: false, createdAt: { gte: since } }, select: { authorId: true, ticketId: true, createdAt: true }, take: 10000 }),
    prisma.supportTicketState.findMany({ where: { status: "RESOLVIDO", updatedAt: { gte: since } } }),
  ]);

  const byTicket = new Map(raw.map((t) => [String(t.id), t]));
  const firstReply = new Map<string, Date>();
  replies.forEach((r) => {
    const cur = firstReply.get(r.ticketId);
    if (!cur || r.createdAt < cur) firstReply.set(r.ticketId, r.createdAt);
  });

  const waits: number[] = [];
  firstReply.forEach((at, ticketId) => {
    const t = byTicket.get(ticketId);
    if (t?.createdAt) waits.push((at.getTime() - new Date(t.createdAt).getTime()) / 3600000);
  });

  const perAdmin = new Map<string, { replies: number; tickets: Set<string> }>();
  replies.forEach((r) => {
    const p = perAdmin.get(r.authorId) ?? { replies: 0, tickets: new Set<string>() };
    p.replies += 1;
    p.tickets.add(r.ticketId);
    perAdmin.set(r.authorId, p);
  });
  const people = perAdmin.size ? await prisma.user.findMany({ where: { id: { in: Array.from(perAdmin.keys()) } }, select: { id: true, name: true } }) : [];
  const names = new Map(people.map((p) => [p.id, p.name]));

  const all = await shape(raw);
  const open = all.filter((t) => t.status !== "RESOLVIDO");
  const over3 = open.filter((t) => (t.ageDays ?? 0) >= 3);

  return {
    last30Days: { replies: replies.length, resolved: states.length, avgFirstResponseHours: waits.length ? Math.round((waits.reduce((s, h) => s + h, 0) / waits.length) * 10) / 10 : null },
    open: { total: open.length, over3Days: over3.length, unanswered: open.filter((t) => t.replies === 0).length },
    admins: Array.from(perAdmin.entries())
      .map(([id, p]) => ({ id, name: names.get(id) ?? "Administrador", replies: p.replies, tickets: p.tickets.size }))
      .sort((a, b) => b.replies - a.replies),
  };
}

export async function officialContacts() {
  const [email, phones] = await Promise.all([getSetting<string>("support.email"), getSetting<string[]>("support.phones")]);
  return { email, phones };
}

// =====================================================================
// Do lado da pessoa: as respostas do suporte aos seus pedidos
// =====================================================================
export async function myReplies(userId: string) {
  const raw = (await readAll(tickets(), 3000)).filter((t) => String(t.userId ?? t.authorId ?? "") === userId);
  if (raw.length === 0) return [];

  const ids = raw.map((t) => String(t.id));
  const [replies, states] = await Promise.all([
    prisma.supportReply.findMany({ where: { ticketId: { in: ids }, isInternal: false }, orderBy: { createdAt: "asc" } }),
    stateMap(ids),
  ]);

  return raw
    .map((t) => {
      const id = String(t.id);
      return {
        ticketId: id,
        subject: String(t.subject ?? t.title ?? String(t.message ?? t.description ?? "Pedido de suporte").slice(0, 60)),
        status: states.get(id)?.status ?? baseStatus(t),
        createdAt: t.createdAt ?? null,
        replies: replies.filter((r) => r.ticketId === id).map((r) => ({ id: r.id, message: r.message, createdAt: r.createdAt })),
      };
    })
    .filter((t) => t.replies.length > 0 || t.status !== "ABERTO")
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 20);
}
