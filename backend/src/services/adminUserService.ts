import { prisma } from "../lib/prisma";
import { findRegion } from "../lib/ngoRegions";
import { clean, safe } from "../lib/agentScope";
import { BUYER_ROLES, EDITABLE_ROLES, PROFILE_KINDS, ROLE_VALUES, isStorageUrl, rolesOfKind, roleName } from "../lib/adminUserCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 30;
const USER_SELECT = {
  id: true,
  name: true,
  phone: true,
  role: true,
  location: true,
  photoUrl: true,
  isVerified: true,
  isActive: true,
  createdAt: true,
} as const;

function parseDay(text: any, endOfDay = false): Date | null {
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text))) {
    throw new Error("Data inválida. Use o formato AAAA-MM-DD.");
  }
  const d = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  if (isNaN(d.getTime())) {
    throw new Error("Data inválida.");
  }
  return d;
}

async function sanctionMap(ids: string[]) {
  const rows = ids.length ? await prisma.userSanction.findMany({ where: { userId: { in: ids }, status: "ATIVA" } }) : [];
  return new Map(rows.map((s) => [s.userId, { kind: s.kind, reason: s.reason, endsAt: s.endsAt }]));
}

// =====================================================================
// Utilizadores
// =====================================================================
export async function listUsers(filters: {
  q?: string;
  role?: string;
  status?: string;
  verified?: string;
  region?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: number;
}) {
  const where: any = {};

  if (filters.role === "BUYER") where.role = { in: BUYER_ROLES as any };
  else if (filters.role && ROLE_VALUES.includes(filters.role)) where.role = filters.role;

  if (filters.status === "ATIVO") {
    where.isActive = true;
  } else if (filters.status === "SUSPENSO" || filters.status === "BLOQUEADO") {
    const kind = filters.status === "SUSPENSO" ? "SUSPENSAO" : "BLOQUEIO";
    const rows = await prisma.userSanction.findMany({ where: { status: "ATIVA", kind }, select: { userId: true }, take: 5000 });
    where.id = { in: rows.map((r) => r.userId) };
    where.isActive = false;
  } else if (filters.status === "INATIVO") {
    where.isActive = false;
  }

  if (filters.verified === "yes") where.isVerified = true;
  if (filters.verified === "no") where.isVerified = false;

  const region = filters.region ? findRegion(filters.region) : null;
  const q = String(filters.q ?? "").trim();
  const digits = q.replace(/\D/g, "");
  const and: any[] = [];

  if (region) and.push({ location: { contains: region.name, mode: "insensitive" } });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  if (and.length > 0) where.AND = and;

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows, all, active] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: filters.sort === "NOME" ? { name: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const sanctions = await sanctionMap(rows.map((r) => r.id));
  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    summary: { all, active, inactive: all - active },
    items: rows.map((u) => ({ ...u, roleName: roleName(u.role), sanction: sanctions.get(u.id) ?? null })),
  };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }

  const role = String(user.role);
  const [sanctions, identity, products, availableProducts, buyerOrders, sellerOrders, recentOrders, recentProducts, reportsAgainst, reportsFiled, audit, rating] =
    await Promise.all([
      prisma.userSanction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.identityVerification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.product.count({ where: { ownerId: userId } }),
      prisma.product.count({ where: { ownerId: userId, isAvailable: true } }),
      prisma.order.count({ where: { buyerId: userId } }),
      prisma.order.count({ where: { sellerId: userId } }),
      prisma.order.findMany({ where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, orderBy: { createdAt: "desc" }, take: 5 }) as Promise<any[]>,
      prisma.product.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" }, take: 5 }) as Promise<any[]>,
      prisma.contentReport.findMany({ where: { reportedUserId: userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.contentReport.count({ where: { reporterId: userId } }),
      prisma.adminAudit.findMany({ where: { targetType: "USER", targetId: userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      safe(
        "avaliação do utilizador",
        async () => {
          const agg = await prisma.review.aggregate({ where: { targetId: userId }, _avg: { rating: true }, _count: { _all: true } });
          return { average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null, count: agg._count._all };
        },
        { average: null as number | null, count: 0 }
      ),
    ]);

  const [transporter, agent, organization, delivered] = await Promise.all([
    role === "TRANSPORTADOR" ? prisma.transporterProfile.findUnique({ where: { userId } }) : Promise.resolve(null),
    role === "AGENTE" ? prisma.agentProfile.findUnique({ where: { userId } }) : Promise.resolve(null),
    role === "ONG" || role === "GOVERNO" ? (prisma.organization.findFirst({ where: { ownerId: userId } }) as Promise<any>) : Promise.resolve(null),
    role === "TRANSPORTADOR" ? prisma.deliveryEvent.count({ where: { actorId: userId, kind: "ENTREGUE" } }) : Promise.resolve(0),
  ]);

  const adminIds = Array.from(new Set(audit.map((a) => a.adminId)));
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
  const adminNames = new Map(admins.map((a) => [a.id, a.name]));

  const timeline = [
    ...recentOrders.map((o) => ({ kind: "ENCOMENDA", text: `Encomenda #${String(o.id).slice(-6).toUpperCase()} (${o.buyerId === userId ? "comprou" : "vendeu"})`, at: o.createdAt })),
    ...recentProducts.map((p) => ({ kind: "PRODUTO", text: `Publicou "${p.title}"`, at: p.createdAt })),
    ...reportsAgainst.map((r) => ({ kind: "DENUNCIA", text: `Denunciado: ${r.category}`, at: r.createdAt })),
    ...sanctions.map((s) => ({ kind: "SANCAO", text: `${s.kind === "BLOQUEIO" ? "Bloqueio" : "Suspensão"}: ${s.reason}`, at: s.createdAt })),
    ...identity.map((i) => ({ kind: "VERIFICACAO", text: `Pedido de verificação (${i.status})`, at: i.createdAt })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 20);

  return {
    user: { ...user, roleName: roleName(user.role) },
    sanctions,
    activeSanction: sanctions.find((s) => s.status === "ATIVA") ?? null,
    identity,
    stats: { products, availableProducts, buyerOrders, sellerOrders, reportsAgainst: reportsAgainst.length, reportsFiled, delivered },
    rating,
    transporter: transporter ? { verificationStatus: transporter.verificationStatus, vehicleType: transporter.vehicleType, plate: transporter.plate } : null,
    agent: agent ? { status: agent.status, agentType: agent.agentType } : null,
    organization: organization ? { name: organization.name, isVerified: !!organization.isVerified } : null,
    reportsAgainst,
    history: audit.map((a) => ({ ...a, adminName: adminNames.get(a.adminId) ?? "Administrador" })),
    timeline,
  };
}

export async function editUser(admin: AdminSnapshot, userId: string, input: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }
  if (String(user.role) === "ADMIN") {
    throw new Error("As contas de administrador gerem-se na equipa.");
  }

  const data: any = {};
  const before: any = {};
  const after: any = {};

  if (input?.name !== undefined) {
    const name = clean(input.name, 120);
    if (!name || name.length < 2) throw new Error("Escreva o nome.");
    if (name !== user.name) {
      data.name = name;
      before.name = user.name;
      after.name = name;
    }
  }

  if (input?.location !== undefined) {
    const location = clean(input.location, 120);
    if (location !== user.location) {
      data.location = location;
      before.location = user.location;
      after.location = location;
    }
  }

  if (input?.phone !== undefined) {
    const phone = String(input.phone).replace(/[\s-]/g, "");
    if (!/^\+?\d{7,15}$/.test(phone)) throw new Error("Telefone inválido.");
    if (phone !== user.phone) {
      const taken = await prisma.user.findFirst({ where: { phone, id: { not: userId } }, select: { id: true } });
      if (taken) throw new Error("Já existe uma conta com este telefone.");
      data.phone = phone;
      before.phone = user.phone;
      after.phone = phone;
    }
  }

  if (input?.photoUrl !== undefined) {
    if (input.photoUrl && !isStorageUrl(input.photoUrl)) throw new Error("Foto inválida.");
    data.photoUrl = input.photoUrl || null;
  }

  let roleChanged = false;
  if (input?.role !== undefined && String(input.role) !== String(user.role)) {
    const role = String(input.role);
    if (!EDITABLE_ROLES.includes(role)) {
      throw new Error("Este perfil não pode ser atribuído aqui.");
    }
    if (String(user.role) === "AGENTE") {
      throw new Error("Os agentes têm o seu próprio fluxo de aprovação.");
    }
    data.role = role as any;
    before.role = String(user.role);
    after.role = role;
    roleChanged = true;
  }

  if (Object.keys(data).length === 0) {
    return getUser(userId);
  }

  await prisma.user.update({ where: { id: userId }, data });

  await logAudit(admin.userId, roleChanged ? "USER_ROLE" : "USER_EDIT", { type: "USER", id: userId }, `Editou a conta de ${user.name}`, { before, after });
  if (roleChanged) {
    await prisma.notification.create({
      data: { userId, type: "SISTEMA", title: "O seu perfil mudou", message: `A sua conta passou a ser: ${roleName(after.role)}.`, relatedId: userId },
    });
  }

  return getUser(userId);
}

export async function setVerified(admin: AdminSnapshot, userId: string, verified: boolean, noteInput: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, isVerified: true } });
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }
  if (user.isVerified === verified) {
    throw new Error(verified ? "Esta conta já está verificada." : "Esta conta não está verificada.");
  }

  const note = clean(noteInput, 300);
  if (!verified && (!note || note.length < 3)) {
    throw new Error("Explique porque a verificação é retirada.");
  }

  await prisma.user.update({ where: { id: userId }, data: { isVerified: verified } });
  await logAudit(admin.userId, verified ? "USER_VERIFY" : "USER_UNVERIFY", { type: "USER", id: userId }, `${verified ? "Verificou" : "Retirou a verificação de"} ${user.name}${note ? `: ${note}` : ""}`);
  await prisma.notification.create({
    data: {
      userId,
      type: "SISTEMA",
      title: verified ? "Conta verificada ✅" : "A sua verificação foi retirada",
      message: verified ? "A sua identidade foi confirmada." : `Motivo: ${note}`,
      relatedId: userId,
    },
  });

  return getUser(userId);
}

// =====================================================================
// Perfis por tipo
// =====================================================================
export async function profileSummary() {
  const [groups, coops] = await Promise.all([
    prisma.user.groupBy({ by: ["role", "isVerified"], where: { isActive: true }, _count: { _all: true } }),
    safe("cooperativas", () => prisma.cooperative.count(), 0),
  ]);

  return PROFILE_KINDS.map((k) => {
    if (k.roles === "COOPERATIVAS") return { value: k.value, label: k.label, icon: k.icon, total: coops, verified: 0 };

    const roles = k.roles === "BUYER" ? BUYER_ROLES : k.roles;
    const rows = groups.filter((g) => roles.includes(String(g.role)));
    return {
      value: k.value,
      label: k.label,
      icon: k.icon,
      total: rows.reduce((s, g) => s + g._count._all, 0),
      verified: rows.filter((g) => g.isVerified).reduce((s, g) => s + g._count._all, 0),
    };
  });
}

export async function listProfiles(kind: string, filters: { q?: string; verified?: string; page?: number }) {
  const def = PROFILE_KINDS.find((k) => k.value === kind);
  if (!def) {
    throw new Error("Tipo de perfil inválido.");
  }

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const q = String(filters.q ?? "").trim();

  if (def.roles === "COOPERATIVAS") {
    const coops: any[] = await prisma.cooperative.findMany({ include: { _count: { select: { members: true } } }, take: 500 });
    const needle = q.toLowerCase();
    const items = coops
      .filter((c) => !needle || `${c.name} ${c.region ?? ""}`.toLowerCase().includes(needle))
      .map((c) => ({ id: c.id, name: c.name, region: c.region ?? null, members: c._count.members, leaderId: c.leaderId ?? null }))
      .sort((a, b) => b.members - a.members);
    return { kind, total: items.length, page: 1, pageSize: items.length, items, cooperatives: true };
  }

  const roles = rolesOfKind(kind) as string[];
  const where: any = { role: { in: roles as any } };
  if (filters.verified === "yes") where.isVerified = true;
  if (filters.verified === "no") where.isVerified = false;
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: USER_SELECT, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const ids = rows.map((r) => r.id);

  const [products, buyer, seller, ratings, orgs, delivered, sanctions] = ids.length
    ? await Promise.all([
        prisma.product.groupBy({ by: ["ownerId"], where: { ownerId: { in: ids }, isAvailable: true }, _count: { _all: true } }),
        prisma.order.groupBy({ by: ["buyerId"], where: { buyerId: { in: ids } }, _count: { _all: true } }),
        prisma.order.groupBy({ by: ["sellerId"], where: { sellerId: { in: ids } }, _count: { _all: true } }),
        safe(
          "avaliações",
          async () => prisma.review.groupBy({ by: ["targetId"], where: { targetId: { in: ids } }, _avg: { rating: true }, _count: { _all: true } }),
          [] as any[]
        ),
        roles.includes("ONG") || roles.includes("GOVERNO") ? (prisma.organization.findMany({ where: { ownerId: { in: ids } } }) as Promise<any[]>) : Promise.resolve([] as any[]),
        roles.includes("TRANSPORTADOR")
          ? prisma.deliveryEvent.groupBy({ by: ["actorId"], where: { actorId: { in: ids }, kind: "ENTREGUE" }, _count: { _all: true } })
          : Promise.resolve([] as any[]),
        sanctionMap(ids),
      ])
    : [[], [], [], [], [], [], new Map()];

  const productMap = new Map((products as any[]).map((p) => [p.ownerId, p._count._all]));
  const buyerMap = new Map((buyer as any[]).map((p) => [p.buyerId, p._count._all]));
  const sellerMap = new Map((seller as any[]).map((p) => [p.sellerId, p._count._all]));
  const ratingMap = new Map((ratings as any[]).map((r) => [r.targetId, { average: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null, count: r._count._all }]));
  const orgMap = new Map((orgs as any[]).map((o) => [o.ownerId, o]));
  const deliveredMap = new Map((delivered as any[]).map((d) => [d.actorId, d._count._all]));

  return {
    kind,
    total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((u) => ({
      ...u,
      roleName: roleName(u.role),
      products: productMap.get(u.id) ?? 0,
      orders: (buyerMap.get(u.id) ?? 0) + (sellerMap.get(u.id) ?? 0),
      rating: ratingMap.get(u.id) ?? { average: null, count: 0 },
      organization: orgMap.get(u.id) ? { name: orgMap.get(u.id).name, isVerified: !!orgMap.get(u.id).isVerified } : null,
      delivered: deliveredMap.get(u.id) ?? 0,
      sanction: (sanctions as Map<string, any>).get(u.id) ?? null,
    })),
  };
}
