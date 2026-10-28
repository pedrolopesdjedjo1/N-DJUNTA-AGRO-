import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean, plain, safe } from "../lib/agentScope";
import { COOP_STATUS } from "../lib/adminFinanceCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const DAY = 86400000;

async function loadCoop(id: string): Promise<any> {
  const c: any = await prisma.cooperative.findUnique({ where: { id }, include: { members: true } });
  if (!c) {
    throw new Error("Cooperativa não encontrada.");
  }
  return c;
}

async function notifyLeader(coop: any, title: string, message: string) {
  if (!coop.leaderId) return;
  await prisma.notification.create({ data: { userId: coop.leaderId, type: "SISTEMA", title, message: message.slice(0, 300), relatedId: coop.id } });
}

// As cooperativas sem análise contam como "por analisar"
function statusOf(review: any | undefined): string {
  return review?.status ?? "SEM_ANALISE";
}

// =====================================================================
export async function listCooperatives(filters: { status?: string; region?: string; q?: string; page?: number }) {
  const [coops, reviews] = await Promise.all([
    prisma.cooperative.findMany({ include: { _count: { select: { members: true } } }, take: 1000 }) as Promise<any[]>,
    prisma.cooperativeReview.findMany(),
  ]);
  const reviewMap = new Map(reviews.map((r) => [r.cooperativeId, r]));

  const leaderIds = Array.from(new Set(coops.map((c) => c.leaderId).filter(Boolean))) as string[];
  const leaders = leaderIds.length ? await prisma.user.findMany({ where: { id: { in: leaderIds } }, select: { id: true, name: true, phone: true, isActive: true } }) : [];
  const leaderMap = new Map(leaders.map((l) => [l.id, l]));

  const region = filters.region ? REGIONS.find((r) => r.key === filters.region) : null;
  const needle = plain(filters.q);

  const all = coops.map((c) => {
    const review = reviewMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      region: c.region ?? null,
      regionKey: findRegion(c.region)?.key ?? null,
      members: c._count.members,
      leader: c.leaderId && leaderMap.get(c.leaderId) ? { id: c.leaderId, name: leaderMap.get(c.leaderId)!.name, phone: leaderMap.get(c.leaderId)!.phone } : null,
      status: statusOf(review),
      note: review?.note ?? null,
      reviewedAt: review?.reviewedAt ?? null,
      createdAt: c.createdAt ?? null,
    };
  });

  const counts: Record<string, number> = { SEM_ANALISE: 0, APROVADA: 0, SUSPENSA: 0, RECUSADA: 0 };
  all.forEach((c) => (counts[c.status] += 1));

  let list = all;
  if (filters.status && COOP_STATUS.some((s) => s.value === filters.status)) list = list.filter((c) => c.status === filters.status);
  if (region) list = list.filter((c) => c.regionKey === region.key);
  if (needle) list = list.filter((c) => plain(`${c.name} ${c.region} ${c.leader?.name}`).includes(needle));
  list.sort((a, b) => b.members - a.members);

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    counts,
    totalMembers: all.reduce((s, c) => s + c.members, 0),
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function getCooperative(id: string) {
  const c = await loadCoop(id);
  const [review, audit] = await Promise.all([
    prisma.cooperativeReview.findUnique({ where: { cooperativeId: id } }),
    prisma.adminAudit.findMany({ where: { targetType: "COOP", targetId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const leader = c.leaderId ? await prisma.user.findUnique({ where: { id: c.leaderId }, select: { id: true, name: true, phone: true, location: true, isVerified: true, isActive: true } }) : null;

  // Os membros: o nome do campo que os liga a uma conta pode variar
  const rawMembers: any[] = Array.isArray(c.members) ? c.members : [];
  const memberUserIds = Array.from(new Set(rawMembers.map((m) => m.userId ?? m.memberId ?? m.farmerId ?? m.accountId ?? null).filter(Boolean))) as string[];
  const memberUsers = memberUserIds.length ? await prisma.user.findMany({ where: { id: { in: memberUserIds } }, select: { id: true, name: true, role: true, location: true, isVerified: true } }) : [];
  const memberMap = new Map(memberUsers.map((u) => [u.id, u]));
  const members = rawMembers.map((m, i) => {
    const uid = m.userId ?? m.memberId ?? m.farmerId ?? m.accountId ?? null;
    const u = uid ? memberMap.get(uid) : null;
    return {
      id: String(m.id ?? i),
      userId: u?.id ?? null,
      name: u?.name ?? m.name ?? "Membro",
      role: u ? String(u.role) : null,
      location: u?.location ?? null,
      isVerified: !!u?.isVerified,
      joinedAt: m.createdAt ?? m.joinedAt ?? null,
    };
  });

  // Atividade: o que o líder e os membros produzem e vendem
  const accountIds = [c.leaderId, ...memberUserIds].filter(Boolean) as string[];
  const since = new Date(Date.now() - 30 * DAY);
  const [products, orders] = accountIds.length
    ? await Promise.all([
        prisma.product.count({ where: { ownerId: { in: accountIds }, isAvailable: true } }),
        prisma.order.aggregate({ where: { sellerId: { in: accountIds }, createdAt: { gte: since } }, _count: { _all: true }, _sum: { total: true } }),
      ])
    : [0, { _count: { _all: 0 }, _sum: { total: 0 } } as any];

  // Projetos de ONGs e do governo na região da cooperativa (não há ligação direta a cooperativas)
  const coopRegion = findRegion(c.region);
  const projects = coopRegion
    ? await safe(
        "projetos na região",
        async () => {
          const rows: any[] = await prisma.ngoProject.findMany({ take: 400 });
          return rows
            .filter((p) => findRegion(p.region ?? p.regionName ?? p.location)?.key === coopRegion.key)
            .slice(0, 15)
            .map((p) => ({ id: p.id, title: p.title ?? p.name ?? "Projeto", status: p.status ? String(p.status) : null }));
        },
        [] as any[]
      )
    : [];

  const adminIds = Array.from(new Set(audit.map((a) => a.adminId)));
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(admins.map((a) => [a.id, a.name]));

  return {
    cooperative: {
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      region: c.region ?? null,
      members: members.length,
      createdAt: c.createdAt ?? null,
      status: statusOf(review),
      note: review?.note ?? null,
      reviewedAt: review?.reviewedAt ?? null,
    },
    leader,
    memberList: members,
    activity: { products, sales30: Number(orders._count._all ?? 0), value30: Math.round(Number(orders._sum.total ?? 0)) },
    regionProjects: projects,
    history: audit.map((a) => ({ ...a, adminName: names.get(a.adminId) ?? "Administrador" })),
  };
}

export async function editCooperative(admin: AdminSnapshot, id: string, input: any) {
  const c = await loadCoop(id);
  const data: any = {};
  const before: any = {};
  const after: any = {};

  if (input?.name !== undefined) {
    const name = clean(input.name, 120);
    if (!name || name.length < 3) throw new Error("Escreva o nome da cooperativa.");
    if (name !== c.name) {
      data.name = name;
      before.name = c.name;
      after.name = name;
    }
  }
  if (input?.description !== undefined) {
    const description = clean(input.description, 1000);
    if (description !== (c.description ?? null)) {
      data.description = description;
      before.description = c.description ?? null;
      after.description = description;
    }
  }
  if (input?.region !== undefined) {
    const region = clean(input.region, 120);
    if (region !== (c.region ?? null)) {
      data.region = region;
      before.region = c.region ?? null;
      after.region = region;
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.cooperative.update({ where: { id }, data });
    await logAudit(admin.userId, "COOP_EDIT", { type: "COOP", id }, `Editou a cooperativa ${c.name}`, { before, after });
    await notifyLeader(c, "A sua cooperativa foi atualizada", "A equipa corrigiu algumas informações da cooperativa.");
  }
  return getCooperative(id);
}

export async function reviewCooperative(admin: AdminSnapshot, id: string, input: any) {
  const c = await loadCoop(id);
  const current = await prisma.cooperativeReview.findUnique({ where: { cooperativeId: id } });
  const status = statusOf(current ?? undefined);

  const decision = String(input?.decision ?? "");
  const note = clean(input?.note, 300);
  let next: string;

  switch (decision) {
    case "APROVAR":
      if (status === "APROVADA") throw new Error("Esta cooperativa já está aprovada.");
      next = "APROVADA";
      break;
    case "RECUSAR":
      if (status !== "SEM_ANALISE") throw new Error("Só se recusam cooperativas por analisar.");
      if (!note || note.length < 3) throw new Error("Explique o motivo da recusa.");
      next = "RECUSADA";
      break;
    case "SUSPENDER":
      if (status === "SUSPENSA") throw new Error("Esta cooperativa já está suspensa.");
      if (!note || note.length < 3) throw new Error("Explique o motivo da suspensão.");
      next = "SUSPENSA";
      break;
    case "REATIVAR":
      if (status !== "SUSPENSA") throw new Error("Esta cooperativa não está suspensa.");
      next = "APROVADA";
      break;
    default:
      throw new Error("Escolha a decisão.");
  }

  await prisma.cooperativeReview.upsert({
    where: { cooperativeId: id },
    create: { cooperativeId: id, status: next, note, reviewedBy: admin.userId },
    update: { status: next, note, reviewedBy: admin.userId, reviewedAt: new Date() },
  });

  const approved = next === "APROVADA";
  await logAudit(admin.userId, approved ? "COOP_APPROVE" : "COOP_SUSPEND", { type: "COOP", id }, `${decision === "APROVAR" ? "Aprovou" : decision === "REATIVAR" ? "Reativou" : decision === "RECUSAR" ? "Recusou" : "Suspendeu"} a cooperativa ${c.name}${note ? `: ${note}` : ""}`);
  await notifyLeader(
    c,
    approved ? "A sua cooperativa foi aprovada ✅" : next === "RECUSADA" ? "A sua cooperativa foi recusada" : "A sua cooperativa foi suspensa",
    approved ? "A cooperativa já pode usar o NÔDJUNTA AGRO." : `Motivo: ${note}`
  );

  return getCooperative(id);
}

// Para as telas dos membros e do líder: o estado de uma cooperativa
export async function coopStatusFor(id: string) {
  const r = await prisma.cooperativeReview.findUnique({ where: { cooperativeId: id } });
  return { status: statusOf(r ?? undefined), note: r?.status === "SUSPENSA" || r?.status === "RECUSADA" ? r.note : null };
}
