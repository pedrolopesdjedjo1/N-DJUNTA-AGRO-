import { prisma } from "../lib/prisma";
import {
  REPORT_CATEGORIES,
  REPORT_DECISIONS,
  REPORT_STATUS,
  REPORT_TARGETS,
  roleName,
} from "../lib/adminUserCatalog";
import { values } from "../lib/ngoCatalog";
import { clean } from "../lib/agentScope";
import { AdminSnapshot, loadAdmin } from "./adminAccess";
import { logAudit } from "./adminAuditService";
import { applySanction } from "./adminSanctionService";

const PAGE_SIZE = 25;
const OPEN = ["ABERTA", "EM_ANALISE"];
const TARGET_VALUES = values(REPORT_TARGETS);
const CATEGORY_VALUES = values(REPORT_CATEGORIES);
const STATUS_VALUES = values(REPORT_STATUS);
const DECISION_VALUES = values(REPORT_DECISIONS);
const DAY = 86400000;

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

async function adminIdsWith(perm: string): Promise<string[]> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  const snaps = await Promise.all(admins.map((a) => loadAdmin(a.id)));
  return snaps.filter((s) => s && s.status === "ATIVO" && s.permissions.has(perm)).map((s) => (s as AdminSnapshot).userId);
}

async function addEvent(reportId: string, authorId: string, kind: string, message?: string | null) {
  await prisma.contentReportEvent.create({ data: { reportId, authorId, kind, message: message ?? null } });
}

// Descreve a coisa denunciada, para quem analisa perceber de que se trata
export async function describeTarget(type: string, id: string | null) {
  const fallback = { label: id ? `${type} ${shortId(id)}` : "—", detail: null as string | null };
  if (!id) return fallback;

  try {
    switch (type) {
      case "USER": {
        const u = await prisma.user.findUnique({ where: { id }, select: { name: true, role: true, location: true, isActive: true } });
        return u
          ? { label: u.name, detail: `${roleName(u.role)}${u.location ? ` · ${u.location}` : ""}${u.isActive ? "" : " · conta inativa"}` }
          : { label: "Utilizador removido", detail: null };
      }
      case "PRODUCT": {
        const p: any = await prisma.product.findUnique({ where: { id } });
        return p ? { label: p.title, detail: p.isAvailable ? "Visível no mercado" : "Escondido do mercado" } : { label: "Produto removido", detail: null };
      }
      case "ORDER": {
        const o: any = await prisma.order.findUnique({ where: { id } });
        return { label: `Encomenda ${shortId(id)}`, detail: o ? `Total ${o.total} FCFA · ${o.status}` : null };
      }
      case "DELIVERY": {
        const d: any = await prisma.delivery.findUnique({ where: { id } });
        return { label: `Entrega ${shortId(d?.orderId ?? id)}`, detail: d ? String(d.status) : null };
      }
      case "PUBLICATION": {
        const p: any = await prisma.publication.findUnique({ where: { id } });
        return p ? { label: p.title ?? "Publicação", detail: null } : { label: "Publicação removida", detail: null };
      }
      case "REVIEW": {
        const r: any = await prisma.review.findUnique({ where: { id } });
        return r ? { label: `Avaliação de ${r.rating} estrelas`, detail: r.comment ?? null } : { label: "Avaliação removida", detail: null };
      }
      default:
        return fallback;
    }
  } catch (error) {
    return fallback;
  }
}

// Quem é a pessoa denunciada, conforme o que se denuncia
async function resolveTarget(reporterId: string, type: string, id: string | null): Promise<string | null> {
  if (type === "OTHER") return null;
  if (!id) throw new Error("Indique o que quer denunciar.");

  switch (type) {
    case "USER": {
      const u = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!u) throw new Error("Utilizador não encontrado.");
      if (id === reporterId) throw new Error("Não pode denunciar a sua própria conta.");
      return id;
    }
    case "PRODUCT": {
      const p = await prisma.product.findUnique({ where: { id }, select: { ownerId: true } });
      if (!p) throw new Error("Produto não encontrado.");
      if (p.ownerId === reporterId) throw new Error("Não pode denunciar o seu próprio produto.");
      return p.ownerId;
    }
    case "ORDER": {
      const o: any = await prisma.order.findUnique({ where: { id } });
      if (!o) throw new Error("Encomenda não encontrada.");
      if (o.buyerId !== reporterId && o.sellerId !== reporterId) throw new Error("Só pode denunciar encomendas em que participa.");
      return o.buyerId === reporterId ? o.sellerId : o.buyerId;
    }
    case "DELIVERY": {
      const d: any = await prisma.delivery.findUnique({ where: { id } });
      if (!d) throw new Error("Entrega não encontrada.");
      const o: any = d.orderId ? await prisma.order.findUnique({ where: { id: d.orderId } }) : null;
      const parties = [o?.buyerId, o?.sellerId, d.transporterId].filter(Boolean);
      if (!parties.includes(reporterId)) throw new Error("Só pode denunciar entregas em que participa.");
      return d.transporterId && d.transporterId !== reporterId ? d.transporterId : o?.sellerId ?? null;
    }
    case "PUBLICATION": {
      const p: any = await prisma.publication.findUnique({ where: { id } });
      if (!p) throw new Error("Publicação não encontrada.");
      return p.ownerId ?? p.authorId ?? null;
    }
    case "REVIEW": {
      const r: any = await prisma.review.findUnique({ where: { id } });
      if (!r) throw new Error("Avaliação não encontrada.");
      return r.authorId ?? null;
    }
    default:
      return null;
  }
}

// =====================================================================
// Do lado das pessoas: denunciar
// =====================================================================
export async function fileReport(reporterId: string, input: any) {
  const targetType = String(input?.targetType ?? "");
  const category = String(input?.category ?? "");
  if (!TARGET_VALUES.includes(targetType)) {
    throw new Error("Escolha o que quer denunciar.");
  }
  if (!CATEGORY_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de problema.");
  }

  const description = clean(input?.description, 1000);
  if (!description || description.length < 10) {
    throw new Error("Explique o que aconteceu (pelo menos 10 letras).");
  }

  const targetId = targetType === "OTHER" ? null : input?.targetId ? String(input.targetId) : null;
  const reportedUserId = await resolveTarget(reporterId, targetType, targetId);

  const today = await prisma.contentReport.count({ where: { reporterId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (today >= 10) {
    throw new Error("Já enviou muitas denúncias hoje. Tente amanhã ou fale com o suporte.");
  }

  if (targetId) {
    const duplicate = await prisma.contentReport.findFirst({ where: { reporterId, targetType, targetId, status: { in: OPEN } } });
    if (duplicate) {
      throw new Error("Já enviou uma denúncia sobre isto e ainda está a ser analisada.");
    }
  }

  const report = await prisma.contentReport.create({ data: { reporterId, targetType, targetId, reportedUserId, category, description } });

  const reviewers = await adminIdsWith("reports.moderate");
  if (reviewers.length > 0) {
    await prisma.notification.createMany({
      data: reviewers.map((userId) => ({
        userId,
        type: "SISTEMA" as const,
        title: category === "FRAUDE" ? "Nova denúncia de fraude" : "Nova denúncia",
        message: description.slice(0, 120),
        relatedId: report.id,
      })),
    });
  }

  return { id: report.id, status: report.status };
}

export async function myReports(reporterId: string) {
  const rows = await prisma.contentReport.findMany({ where: { reporterId }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    category: r.category,
    description: r.description,
    status: r.status,
    decided: r.status === "RESOLVIDA" || r.status === "ARQUIVADA",
    createdAt: r.createdAt,
    decidedAt: r.decidedAt,
  }));
}

// =====================================================================
// Equipa: analisar as denúncias
// =====================================================================
function priorityOf(count: number, category: string): string {
  if (count >= 3 || category === "FRAUDE") return "ALTA";
  if (count === 2) return "MEDIA";
  return "NORMAL";
}

export async function listReports(
  admin: AdminSnapshot,
  filters: { status?: string; targetType?: string; category?: string; assigned?: string; q?: string; page?: number }
) {
  const where: any = {};

  if (filters.status === "ALL") {
    // todas
  } else if (filters.status && STATUS_VALUES.includes(filters.status)) {
    where.status = filters.status;
  } else {
    where.status = { in: OPEN };
  }
  if (filters.targetType && TARGET_VALUES.includes(filters.targetType)) where.targetType = filters.targetType;
  if (filters.category && CATEGORY_VALUES.includes(filters.category)) where.category = filters.category;
  if (filters.assigned === "me") where.assignedTo = admin.userId;
  if (filters.assigned === "none") where.assignedTo = null;
  if (filters.q) where.description = { contains: filters.q, mode: "insensitive" };

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows, byStatus, openByTarget, openByCategory] = await Promise.all([
    prisma.contentReport.count({ where }),
    prisma.contentReport.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.contentReport.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contentReport.groupBy({ by: ["targetType"], where: { status: { in: OPEN } }, _count: { _all: true } }),
    prisma.contentReport.groupBy({ by: ["category"], where: { status: { in: OPEN } }, _count: { _all: true } }),
  ]);

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.reporterId, r.reportedUserId, r.assignedTo]).filter(Boolean))) as string[];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, role: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const targets = rows.filter((r) => r.targetId);
  const piles = targets.length
    ? await prisma.contentReport.groupBy({
        by: ["targetType", "targetId"],
        where: { OR: targets.map((r) => ({ targetType: r.targetType, targetId: r.targetId })), createdAt: { gte: new Date(Date.now() - 30 * DAY) } },
        _count: { _all: true },
      })
    : [];
  const pileMap = new Map(piles.map((p) => [`${p.targetType}:${p.targetId}`, p._count._all]));

  const described = await Promise.all(rows.map((r) => describeTarget(r.targetType, r.targetId)));

  const counts: Record<string, number> = {};
  byStatus.forEach((g) => (counts[g.status] = g._count._all));
  const targetCounts: Record<string, number> = {};
  openByTarget.forEach((g) => (targetCounts[g.targetType] = g._count._all));
  const categoryCounts: Record<string, number> = {};
  openByCategory.forEach((g) => (categoryCounts[g.category] = g._count._all));

  return {
    counts,
    targetCounts,
    categoryCounts,
    total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((r, i) => {
      const pile = r.targetId ? pileMap.get(`${r.targetType}:${r.targetId}`) ?? 1 : 1;
      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        target: described[i],
        category: r.category,
        description: r.description,
        status: r.status,
        priority: priorityOf(pile, r.category),
        reportsOnTarget: pile,
        reporter: userMap.get(r.reporterId) ? { id: r.reporterId, name: userMap.get(r.reporterId)!.name } : null,
        reported: r.reportedUserId && userMap.get(r.reportedUserId) ? { id: r.reportedUserId, name: userMap.get(r.reportedUserId)!.name, roleName: roleName(userMap.get(r.reportedUserId)!.role) } : null,
        assignedTo: r.assignedTo ? { id: r.assignedTo, name: userMap.get(r.assignedTo)?.name ?? "Administrador" } : null,
        decision: r.decision,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
      };
    }),
  };
}

export async function getReport(id: string) {
  const r = await prisma.contentReport.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Denúncia não encontrada.");
  }

  const [events, others, history, reporter, reported] = await Promise.all([
    prisma.contentReportEvent.findMany({ where: { reportId: id }, orderBy: { createdAt: "asc" }, take: 100 }),
    r.targetId
      ? prisma.contentReport.findMany({ where: { targetType: r.targetType, targetId: r.targetId, id: { not: id } }, orderBy: { createdAt: "desc" }, take: 20 })
      : Promise.resolve([] as any[]),
    r.reportedUserId ? prisma.userSanction.findMany({ where: { userId: r.reportedUserId }, orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([] as any[]),
    prisma.user.findUnique({ where: { id: r.reporterId }, select: { id: true, name: true, role: true, phone: true } }),
    r.reportedUserId ? prisma.user.findUnique({ where: { id: r.reportedUserId }, select: { id: true, name: true, role: true, phone: true, isActive: true } }) : Promise.resolve(null),
  ]);

  const peopleIds = Array.from(new Set([...events.map((e) => e.authorId), ...(others as any[]).map((o) => o.reporterId), r.assignedTo, r.decidedBy].filter(Boolean))) as string[];
  const people = peopleIds.length ? await prisma.user.findMany({ where: { id: { in: peopleIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(people.map((p) => [p.id, p.name]));

  const target = await describeTarget(r.targetType, r.targetId);
  const pile = (others as any[]).filter((o) => Date.now() - new Date(o.createdAt).getTime() < 30 * DAY).length + 1;

  return {
    report: {
      ...r,
      priority: priorityOf(pile, r.category),
      assignedName: r.assignedTo ? names.get(r.assignedTo) ?? "Administrador" : null,
      decidedName: r.decidedBy ? names.get(r.decidedBy) ?? "Administrador" : null,
    },
    target,
    reporter: reporter ? { ...reporter, roleName: roleName(reporter.role) } : null,
    reported: reported ? { ...reported, roleName: roleName(reported.role) } : null,
    otherReports: (others as any[]).map((o) => ({
      id: o.id,
      category: o.category,
      status: o.status,
      description: o.description,
      createdAt: o.createdAt,
      reporterName: names.get(o.reporterId) ?? "Utilizador",
    })),
    sanctionHistory: history,
    events: events.map((e) => ({ ...e, authorName: names.get(e.authorId) ?? "Administrador" })),
    canDecide: OPEN.includes(r.status),
  };
}

export async function assignReport(admin: AdminSnapshot, id: string) {
  const r = await prisma.contentReport.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Denúncia não encontrada.");
  }
  if (!OPEN.includes(r.status)) {
    throw new Error("Esta denúncia já foi decidida.");
  }

  await prisma.contentReport.update({ where: { id }, data: { assignedTo: admin.userId, status: "EM_ANALISE" } });
  await addEvent(id, admin.userId, "ATRIBUIDA", `${admin.name} assumiu esta denúncia.`);
  await logAudit(admin.userId, "REPORT_ASSIGN", { type: "REPORT", id }, `Assumiu a denúncia ${shortId(id)}`);

  return getReport(id);
}

export async function noteReport(admin: AdminSnapshot, id: string, messageInput: any) {
  const r = await prisma.contentReport.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Denúncia não encontrada.");
  }
  const message = clean(messageInput, 500);
  if (!message || message.length < 3) {
    throw new Error("Escreva a nota.");
  }

  await addEvent(id, admin.userId, "NOTA", message);
  return getReport(id);
}

export async function decideReport(admin: AdminSnapshot, id: string, input: any) {
  const r = await prisma.contentReport.findUnique({ where: { id } });
  if (!r) {
    throw new Error("Denúncia não encontrada.");
  }
  if (!OPEN.includes(r.status)) {
    throw new Error("Esta denúncia já foi decidida.");
  }

  const decision = String(input?.decision ?? "");
  if (!DECISION_VALUES.includes(decision)) {
    throw new Error("Escolha a decisão.");
  }
  const note = clean(input?.note, 500);
  if (!note || note.length < 3) {
    throw new Error("Explique a decisão. Fica no histórico.");
  }

  const needsPerson = ["AVISO", "SUSPENDER", "BLOQUEAR"].includes(decision);
  if (needsPerson && !r.reportedUserId) {
    throw new Error("Esta denúncia não tem uma pessoa associada. Escolha outra decisão.");
  }
  if (decision === "REMOVER_PRODUTO" && (r.targetType !== "PRODUCT" || !r.targetId)) {
    throw new Error("Só se pode remover o produto numa denúncia de produto.");
  }

  // 1. A ação
  if (decision === "AVISO") {
    await prisma.notification.create({
      data: {
        userId: r.reportedUserId as string,
        type: "SISTEMA",
        title: "Aviso da equipa do NÔDJUNTA AGRO",
        message: `Recebemos uma denúncia sobre si. ${note}`,
        relatedId: id,
      },
    });
  } else if (decision === "SUSPENDER") {
    const days = Math.floor(Number(input?.days));
    if (isNaN(days) || days < 1 || days > 365) {
      throw new Error("Indique por quantos dias suspender (de 1 a 365).");
    }
    await applySanction(admin.userId, r.reportedUserId as string, "SUSPENSAO", note, new Date(Date.now() + days * DAY), id);
  } else if (decision === "BLOQUEAR") {
    await applySanction(admin.userId, r.reportedUserId as string, "BLOQUEIO", note, null, id);
  } else if (decision === "REMOVER_PRODUTO") {
    await prisma.product.update({ where: { id: r.targetId as string }, data: { isAvailable: false } });
    await logAudit(admin.userId, "PRODUCT_REMOVE", { type: "PRODUCT", id: r.targetId as string }, `Removeu um produto por denúncia: ${note}`, { reportId: id });
    if (r.reportedUserId) {
      await prisma.notification.create({
        data: { userId: r.reportedUserId, type: "SISTEMA", title: "Um produto seu foi removido", message: `Motivo: ${note}`, relatedId: r.targetId },
      });
    }
  }

  // 2. A decisão fica registada, também nas denúncias iguais ainda abertas
  const status = decision === "SEM_ACAO" ? "ARQUIVADA" : "RESOLVIDA";
  const now = new Date();
  await prisma.contentReport.update({ where: { id }, data: { status, decision, decisionNote: note, decidedBy: admin.userId, decidedAt: now } });
  await addEvent(id, admin.userId, "DECISAO", `${REPORT_DECISIONS.find((d) => d.value === decision)?.label}: ${note}`);

  const similar = r.targetId
    ? await prisma.contentReport.findMany({ where: { targetType: r.targetType, targetId: r.targetId, status: { in: OPEN }, id: { not: id } }, take: 50 })
    : [];
  for (const s of similar) {
    await prisma.contentReport.update({ where: { id: s.id }, data: { status, decision, decisionNote: `Decidido em conjunto com a denúncia ${shortId(id)}. ${note}`, decidedBy: admin.userId, decidedAt: now } });
    await addEvent(s.id, admin.userId, "DECISAO", `Decidido em conjunto com a denúncia ${shortId(id)}.`);
  }

  // 3. Quem denunciou é avisado de que foi analisado
  const reporters = Array.from(new Set([r.reporterId, ...similar.map((s) => s.reporterId)]));
  await prisma.notification.createMany({
    data: reporters.map((userId) => ({
      userId,
      type: "SISTEMA" as const,
      title: "A sua denúncia foi analisada",
      message: "Obrigado por nos avisar. A equipa analisou o caso e tomou uma decisão.",
      relatedId: id,
    })),
  });

  await logAudit(admin.userId, "REPORT_DECIDE", { type: "REPORT", id }, `Decidiu a denúncia ${shortId(id)}: ${REPORT_DECISIONS.find((d) => d.value === decision)?.label}`, {
    decision,
    closedTogether: similar.length,
  });

  return getReport(id);
}
