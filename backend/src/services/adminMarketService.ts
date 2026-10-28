import { prisma } from "../lib/prisma";
import { REGIONS } from "../lib/ngoRegions";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { getSetting } from "../lib/platformSettings";
import { roleName } from "../lib/adminUserCatalog";
import { DEPARTMENTS, DEPARTMENT_VALUES, MODERATION_REASONS, QUALITY_FLAGS } from "../lib/adminOpsCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const OPEN = ["ABERTA", "EM_ANALISE"];
const REASON_VALUES = values(MODERATION_REASONS);
const FLAG_VALUES = values(QUALITY_FLAGS);
const FEATURE_MAX = 20;

// =====================================================================
// Ajudas
// =====================================================================
async function moderatedIds(statuses?: string[]): Promise<string[]> {
  const rows = await prisma.productModeration.findMany({
    where: statuses ? { status: { in: statuses } } : {},
    select: { productId: true },
    take: 20000,
  });
  return rows.map((r) => r.productId);
}

async function reportedProductIds(): Promise<string[]> {
  const rows = await prisma.contentReport.findMany({
    where: { targetType: "PRODUCT", status: { in: OPEN }, targetId: { not: null } },
    select: { targetId: true },
    take: 5000,
  });
  return Array.from(new Set(rows.map((r) => r.targetId as string)));
}

async function featuredRows(ids?: string[]) {
  const now = new Date();
  return prisma.highlight.findMany({
    where: { kind: "PRODUTO", startsAt: { lte: now }, endsAt: { gt: now }, ...(ids ? { refId: { in: ids } } : {}) },
  });
}

async function loadProduct(id: string): Promise<any> {
  const p: any = await prisma.product.findUnique({ where: { id } });
  if (!p) {
    throw new Error("Produto não encontrado.");
  }
  return p;
}

async function notifyOwner(p: any, title: string, message: string) {
  await prisma.notification.create({ data: { userId: p.ownerId, type: "SISTEMA", title, message: message.slice(0, 300), relatedId: p.id } });
}

async function endFeature(productId: string) {
  await prisma.highlight.updateMany({ where: { kind: "PRODUTO", refId: productId, endsAt: { gt: new Date() } }, data: { endsAt: new Date() } });
}

// Preço típico por departamento e unidade (mediana), para detetar preços estranhos
let medianCache: { at: number; map: Map<string, number> } | null = null;

async function medians(): Promise<Map<string, number>> {
  if (medianCache && Date.now() - medianCache.at < 300000) return medianCache.map;

  const rows: any[] = await prisma.product.findMany({ where: { isAvailable: true }, select: { department: true, unit: true, price: true }, take: 6000 });
  const groups = new Map<string, number[]>();
  rows.forEach((r) => {
    const price = Number(r.price);
    if (!price || price <= 0) return;
    const key = `${r.department ?? "OUTRO"}|${plain(r.unit)}`;
    groups.set(key, [...(groups.get(key) ?? []), price]);
  });

  const map = new Map<string, number>();
  groups.forEach((list, key) => {
    if (list.length >= 5) {
      list.sort((a, b) => a - b);
      map.set(key, list[Math.floor(list.length / 2)]);
    }
  });

  medianCache = { at: Date.now(), map };
  return map;
}

function qualityOf(p: any, med: Map<string, number>, duplicates: number): string[] {
  const flags: string[] = [];
  const price = Number(p.price);
  const images = Array.isArray(p.images) ? p.images : [];

  if (images.length === 0) flags.push("SEM_FOTO");
  if (!p.description || String(p.description).trim().length < 20) flags.push("SEM_DESCRICAO");
  if (p.price === null || p.price === undefined || !price || price <= 0) flags.push("SEM_PRECO");
  else {
    const typical = med.get(`${p.department ?? "OUTRO"}|${plain(p.unit)}`);
    if (typical && (price > typical * 10 || price < typical / 10)) flags.push("PRECO_ESTRANHO");
  }
  if (!p.title || String(p.title).trim().length < 4) flags.push("TITULO_CURTO");
  if (duplicates > 1) flags.push("DUPLICADO");
  if (p.isAvailable && p.stock !== null && p.stock !== undefined && Number(p.stock) <= 0) flags.push("SEM_STOCK");
  return flags;
}

// =====================================================================
// Cartões de produto
// =====================================================================
async function shapeProducts(rows: any[], cutoff: Date) {
  if (rows.length === 0) return [] as any[];

  const ids = rows.map((p) => p.id);
  const ownerIds = Array.from(new Set(rows.map((p) => p.ownerId)));

  const [owners, moderation, reports, featured, dups, med] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, role: true, location: true, isVerified: true, isActive: true } }),
    prisma.productModeration.findMany({ where: { productId: { in: ids } } }),
    prisma.contentReport.groupBy({ by: ["targetId"], where: { targetType: "PRODUCT", targetId: { in: ids }, status: { in: OPEN } }, _count: { _all: true } }),
    featuredRows(ids),
    prisma.product.groupBy({ by: ["ownerId", "title"], where: { ownerId: { in: ownerIds } }, _count: { _all: true } }),
    medians(),
  ]);

  const ownerMap = new Map(owners.map((o) => [o.id, o]));
  const modMap = new Map(moderation.map((m) => [m.productId, m]));
  const reportMap = new Map(reports.map((r) => [r.targetId as string, r._count._all]));
  const featuredMap = new Map(featured.map((f) => [f.refId, f]));
  const dupMap = new Map(dups.map((d) => [`${d.ownerId}|${d.title}`, d._count._all]));

  return rows.map((p) => {
    const mod = modMap.get(p.id) ?? null;
    const owner = ownerMap.get(p.ownerId);
    const images = Array.isArray(p.images) ? p.images : [];
    const hiddenByAdmin = mod?.status === "REJEITADO" || mod?.status === "REMOVIDO";

    return {
      id: p.id,
      title: p.title,
      price: p.price ?? null,
      unit: p.unit ?? null,
      stock: p.stock ?? null,
      department: p.department ?? null,
      subcategory: p.subcategory ?? null,
      location: p.location ?? null,
      image: images[0] ?? null,
      imagesCount: images.length,
      isAvailable: !!p.isAvailable,
      createdAt: p.createdAt,
      owner: owner ? { id: owner.id, name: owner.name, roleName: roleName(owner.role), location: owner.location, isVerified: owner.isVerified, isActive: owner.isActive } : null,
      moderation: mod ? { status: mod.status, category: mod.category, reason: mod.reason, reviewedAt: mod.reviewedAt, qualityFlags: mod.qualityFlags } : null,
      conflict: hiddenByAdmin && !!p.isAvailable,
      toReview: !mod && new Date(p.createdAt).getTime() >= cutoff.getTime(),
      reports: reportMap.get(p.id) ?? 0,
      featured: featuredMap.get(p.id) ? { endsAt: featuredMap.get(p.id)!.endsAt } : null,
      quality: qualityOf(p, med, dupMap.get(`${p.ownerId}|${p.title}`) ?? 1),
    };
  });
}

export async function listProducts(filters: { q?: string; department?: string; status?: string; ownerId?: string; region?: string; sort?: string; page?: number }) {
  const reviewHours = await getSetting<number>("market.newProductReviewHours");
  const cutoff = new Date(Date.now() - reviewHours * 3600000);
  const moderated = await moderatedIds();
  const and: any[] = [];

  const q = String(filters.q ?? "").trim();
  if (q) and.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { subcategory: { contains: q, mode: "insensitive" } }] });
  if (filters.department && DEPARTMENT_VALUES.includes(filters.department)) and.push({ department: filters.department });

  if (filters.ownerId) {
    and.push({ ownerId: filters.ownerId });
  } else if (filters.region) {
    const region = REGIONS.find((r) => r.key === filters.region);
    if (region) {
      const owners = await prisma.user.findMany({ where: { location: { contains: region.name, mode: "insensitive" } }, select: { id: true }, take: 5000 });
      and.push({ ownerId: { in: owners.map((o) => o.id) } });
    }
  }

  switch (filters.status) {
    case "VISIVEL":
      and.push({ isAvailable: true });
      break;
    case "ESCONDIDO":
      and.push({ isAvailable: false });
      break;
    case "REVISAO":
      and.push({ createdAt: { gte: cutoff } });
      if (moderated.length) and.push({ id: { notIn: moderated } });
      break;
    case "REJEITADO":
    case "REMOVIDO":
    case "ATENCAO":
      and.push({ id: { in: await moderatedIds([filters.status]) } });
      break;
    case "DENUNCIADO":
      and.push({ id: { in: await reportedProductIds() } });
      break;
    case "DESTAQUE":
      and.push({ id: { in: (await featuredRows()).map((f) => f.refId) } });
      break;
  }

  let orderBy: any = { createdAt: "desc" };
  if (filters.sort === "ANTIGOS") orderBy = { createdAt: "asc" };
  if (filters.sort === "PRECO_ALTO") orderBy = { price: "desc" };
  if (filters.sort === "PRECO_BAIXO") orderBy = { price: "asc" };

  const where = and.length ? { AND: and } : {};
  const page = Math.max(1, Math.floor(filters.page ?? 1));

  const [total, rows, all, visible, rejected, removed, attention, toReview, reported, featured] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }) as Promise<any[]>,
    prisma.product.count(),
    prisma.product.count({ where: { isAvailable: true } }),
    prisma.productModeration.count({ where: { status: "REJEITADO" } }),
    prisma.productModeration.count({ where: { status: "REMOVIDO" } }),
    prisma.productModeration.count({ where: { status: "ATENCAO" } }),
    prisma.product.count({ where: { createdAt: { gte: cutoff }, ...(moderated.length ? { id: { notIn: moderated } } : {}) } }),
    reportedProductIds(),
    featuredRows(),
  ]);

  return {
    summary: { all, visible, hidden: all - visible, rejected, removed, attention, toReview, reported: reported.length, featured: featured.length },
    total,
    page,
    pageSize: PAGE_SIZE,
    items: await shapeProducts(rows, cutoff),
  };
}

export async function getProduct(id: string) {
  const p = await loadProduct(id);
  const reviewHours = await getSetting<number>("market.newProductReviewHours");
  const cutoff = new Date(Date.now() - reviewHours * 3600000);

  const [card] = await shapeProducts([p], cutoff);
  const [reports, sales, others, audit] = await Promise.all([
    prisma.contentReport.findMany({ where: { targetType: "PRODUCT", targetId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.orderItem.aggregate({ where: { productId: id }, _sum: { quantity: true }, _count: { _all: true } }),
    prisma.product.count({ where: { ownerId: p.ownerId } }),
    prisma.adminAudit.findMany({ where: { targetType: "PRODUCT", targetId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const adminIds = Array.from(new Set(audit.map((a) => a.adminId)));
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(admins.map((a) => [a.id, a.name]));

  return {
    product: {
      ...card,
      description: p.description ?? null,
      images: Array.isArray(p.images) ? p.images : [],
      details: p.details ?? null,
    },
    reports,
    sales: { orders: sales._count._all, quantity: Number(sales._sum.quantity ?? 0) },
    ownerProducts: others,
    history: audit.map((a) => ({ ...a, adminName: names.get(a.adminId) ?? "Administrador" })),
  };
}

// =====================================================================
// Decisões sobre produtos
// =====================================================================
async function saveModeration(admin: AdminSnapshot, p: any, data: { status: string; category?: string | null; reason?: string | null; qualityFlags?: string[]; wasAvailable?: boolean | null }) {
  const existing = await prisma.productModeration.findUnique({ where: { productId: p.id } });

  // O estado em que o produto estava antes de ser escondido guarda-se uma só vez
  const wasAvailable =
    data.wasAvailable !== undefined ? data.wasAvailable : existing && existing.wasAvailable !== null && !p.isAvailable ? existing.wasAvailable : p.isAvailable;

  const payload = {
    status: data.status,
    category: data.category ?? null,
    reason: data.reason ?? null,
    qualityFlags: data.qualityFlags ?? [],
    wasAvailable,
    reviewedBy: admin.userId,
    reviewedAt: new Date(),
  };

  await prisma.productModeration.upsert({ where: { productId: p.id }, create: { productId: p.id, ...payload }, update: payload });
}

export async function approveProduct(admin: AdminSnapshot, id: string, noteInput: any) {
  const p = await loadProduct(id);
  const mod = await prisma.productModeration.findUnique({ where: { productId: id } });

  if (mod && (mod.status === "REJEITADO" || mod.status === "REMOVIDO")) {
    throw new Error("Este produto está escondido. Use \"Repor no mercado\".");
  }

  await saveModeration(admin, p, { status: "APROVADO", reason: clean(noteInput, 300), wasAvailable: p.isAvailable });
  await logAudit(admin.userId, "PRODUCT_APPROVE", { type: "PRODUCT", id }, `Aprovou "${p.title}"`);
  return getProduct(id);
}

export async function bulkApprove(admin: AdminSnapshot, idsInput: any) {
  if (!Array.isArray(idsInput) || idsInput.length === 0) {
    throw new Error("Escolha os produtos a aprovar.");
  }
  const ids = Array.from(new Set(idsInput.map(String))).slice(0, 50);

  const [products, mods] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: ids } } }) as Promise<any[]>,
    prisma.productModeration.findMany({ where: { productId: { in: ids } } }),
  ]);
  const hidden = new Set(mods.filter((m) => m.status === "REJEITADO" || m.status === "REMOVIDO").map((m) => m.productId));

  let done = 0;
  for (const p of products) {
    if (hidden.has(p.id)) continue;
    await saveModeration(admin, p, { status: "APROVADO", wasAvailable: p.isAvailable });
    done += 1;
  }

  await logAudit(admin.userId, "PRODUCT_BULK_APPROVE", { type: "PRODUCT", id: ids[0] }, `Aprovou ${done} produto(s) de uma vez`, { count: done });
  return { approved: done, skipped: ids.length - done };
}

async function hide(admin: AdminSnapshot, id: string, status: "REJEITADO" | "REMOVIDO", input: any) {
  const p = await loadProduct(id);

  const category = String(input?.reason ?? "");
  if (!REASON_VALUES.includes(category)) {
    throw new Error("Escolha o motivo.");
  }
  const note = clean(input?.note, 300);
  if (!note || note.length < 5) {
    throw new Error("Explique o motivo (pelo menos 5 letras). O vendedor vê esta explicação.");
  }

  await saveModeration(admin, p, { status, category, reason: note });
  await prisma.product.update({ where: { id }, data: { isAvailable: false } });
  await endFeature(id);

  const label = MODERATION_REASONS.find((r) => r.value === category)?.label ?? category;
  await notifyOwner(
    p,
    status === "REMOVIDO" ? "Um produto seu foi removido" : "Um produto seu foi rejeitado",
    `"${p.title}": ${label}. ${note}${status === "REJEITADO" ? " Corrija o anúncio e fale com o suporte para voltar a aparecer." : ""}`
  );
  await logAudit(admin.userId, status === "REMOVIDO" ? "PRODUCT_REMOVE" : "PRODUCT_REJECT", { type: "PRODUCT", id }, `${status === "REMOVIDO" ? "Removeu" : "Rejeitou"} "${p.title}": ${label}`, { note });

  // As denúncias abertas sobre este produto ficam resolvidas e quem denunciou é avisado
  if (status === "REMOVIDO" && input?.resolveReports !== false) {
    const open = await prisma.contentReport.findMany({ where: { targetType: "PRODUCT", targetId: id, status: { in: OPEN } } });
    if (open.length > 0) {
      await prisma.contentReport.updateMany({
        where: { id: { in: open.map((r) => r.id) } },
        data: { status: "RESOLVIDA", decision: "REMOVER_PRODUTO", decisionNote: note, decidedBy: admin.userId, decidedAt: new Date() },
      });
      await prisma.notification.createMany({
        data: Array.from(new Set(open.map((r) => r.reporterId))).map((userId) => ({
          userId,
          type: "SISTEMA" as const,
          title: "A sua denúncia foi analisada",
          message: "Obrigado por nos avisar. O produto denunciado foi removido.",
          relatedId: id,
        })),
      });
    }
  }

  return getProduct(id);
}

export function rejectProduct(admin: AdminSnapshot, id: string, input: any) {
  return hide(admin, id, "REJEITADO", input);
}

export function removeProduct(admin: AdminSnapshot, id: string, input: any) {
  return hide(admin, id, "REMOVIDO", input);
}

export async function restoreProduct(admin: AdminSnapshot, id: string, noteInput: any) {
  const p = await loadProduct(id);
  const mod = await prisma.productModeration.findUnique({ where: { productId: id } });

  if (!mod || (mod.status !== "REJEITADO" && mod.status !== "REMOVIDO")) {
    throw new Error("Este produto não está escondido por decisão da equipa.");
  }
  const note = clean(noteInput, 300);
  if (!note || note.length < 3) {
    throw new Error("Explique porque o produto volta ao mercado.");
  }

  await prisma.product.update({ where: { id }, data: { isAvailable: mod.wasAvailable ?? true } });
  await saveModeration(admin, p, { status: "APROVADO", reason: note, wasAvailable: mod.wasAvailable ?? true });

  await notifyOwner(p, "O seu produto voltou ao mercado", `"${p.title}" voltou a aparecer. ${note}`);
  await logAudit(admin.userId, "PRODUCT_RESTORE", { type: "PRODUCT", id }, `Repôs "${p.title}": ${note}`);
  return getProduct(id);
}

// Controlo de qualidade: o produto continua visível, mas o vendedor recebe um aviso para corrigir
export async function flagQuality(admin: AdminSnapshot, id: string, input: any) {
  const p = await loadProduct(id);
  const flags = Array.isArray(input?.flags) ? Array.from(new Set(input.flags.map(String))) as string[] : [];
  if (flags.length === 0 || !flags.every((f) => FLAG_VALUES.includes(f))) {
    throw new Error("Escolha o que há a corrigir.");
  }

  const mod = await prisma.productModeration.findUnique({ where: { productId: id } });
  if (mod && (mod.status === "REJEITADO" || mod.status === "REMOVIDO")) {
    throw new Error("Este produto já está escondido.");
  }

  const note = clean(input?.note, 300);
  const labels = flags.map((f) => QUALITY_FLAGS.find((q) => q.value === f)?.label ?? f);

  await saveModeration(admin, p, { status: "ATENCAO", reason: note, qualityFlags: flags, wasAvailable: p.isAvailable });
  await notifyOwner(p, "Melhore o seu anúncio", `"${p.title}": ${labels.join(", ")}.${note ? ` ${note}` : ""} Anúncios completos vendem mais.`);
  await logAudit(admin.userId, "PRODUCT_QUALITY", { type: "PRODUCT", id }, `Avisou sobre "${p.title}": ${labels.join(", ")}`);
  return getProduct(id);
}

// =====================================================================
// Destaques
// =====================================================================
export async function featureProduct(admin: AdminSnapshot, id: string, daysInput: any) {
  const p = await loadProduct(id);
  if (!p.isAvailable) {
    throw new Error("Só se pode pôr em destaque um produto visível no mercado.");
  }

  const days = Math.floor(Number(daysInput ?? 14));
  if (isNaN(days) || days < 1 || days > 90) {
    throw new Error("Indique por quantos dias (de 1 a 90).");
  }

  const active = await featuredRows();
  const current = active.find((f) => f.refId === id);
  if (!current && active.length >= FEATURE_MAX) {
    throw new Error(`Já há ${FEATURE_MAX} produtos em destaque. Termine algum antes.`);
  }

  const endsAt = new Date(Date.now() + days * 86400000);
  if (current) await prisma.highlight.update({ where: { id: current.id }, data: { endsAt } });
  else await prisma.highlight.create({ data: { kind: "PRODUTO", refId: id, label: p.title, endsAt, createdBy: admin.userId } });

  await logAudit(admin.userId, "PRODUCT_FEATURE", { type: "PRODUCT", id }, `Pôs "${p.title}" em destaque por ${days} dia(s)`);
  return getProduct(id);
}

export async function unfeatureProduct(admin: AdminSnapshot, id: string) {
  const p = await loadProduct(id);
  await endFeature(id);
  await logAudit(admin.userId, "PRODUCT_FEATURE", { type: "PRODUCT", id }, `Tirou "${p.title}" dos destaques`);
  return getProduct(id);
}

export async function listFeatured() {
  const rows = await featuredRows();
  const ids = rows.map((r) => r.refId);
  const products: any[] = ids.length ? await prisma.product.findMany({ where: { id: { in: ids } } }) : [];
  const cards = await shapeProducts(products, new Date(0));
  const byId = new Map(cards.map((c) => [c.id, c]));

  return {
    max: FEATURE_MAX,
    items: rows
      .map((r) => ({ highlightId: r.id, endsAt: r.endsAt, product: byId.get(r.refId) ?? null }))
      .filter((r) => r.product)
      .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()),
  };
}

// =====================================================================
// Controlo de qualidade
// =====================================================================
let scanCache: { at: number; list: { id: string; flags: string[] }[] } | null = null;

async function qualityScan() {
  if (scanCache && Date.now() - scanCache.at < 120000) return scanCache.list;

  const rows: any[] = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { id: true, ownerId: true, title: true, description: true, price: true, unit: true, stock: true, images: true, department: true, isAvailable: true },
  });
  const med = await medians();

  const dups = new Map<string, number>();
  rows.forEach((p) => {
    const key = `${p.ownerId}|${plain(p.title)}`;
    dups.set(key, (dups.get(key) ?? 0) + 1);
  });

  const list = rows
    .map((p) => ({ id: p.id as string, flags: qualityOf(p, med, dups.get(`${p.ownerId}|${plain(p.title)}`) ?? 1) }))
    .filter((p) => p.flags.length > 0);

  scanCache = { at: Date.now(), list };
  return list;
}

export async function listQuality(filters: { flag?: string; page?: number }) {
  const list = await qualityScan();

  const counts: Record<string, number> = {};
  list.forEach((p) => p.flags.forEach((f) => (counts[f] = (counts[f] ?? 0) + 1)));

  const filtered = filters.flag && FLAG_VALUES.includes(filters.flag) ? list.filter((p) => p.flags.includes(filters.flag as string)) : list;
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows: any[] = slice.length ? await prisma.product.findMany({ where: { id: { in: slice.map((s) => s.id) } } }) : [];
  const cards = await shapeProducts(rows, new Date(0));
  const byId = new Map(cards.map((c) => [c.id, c]));

  return {
    counts,
    total: filtered.length,
    flagged: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: slice.map((s) => byId.get(s.id)).filter(Boolean),
  };
}

// =====================================================================
// Categorias
// =====================================================================
export async function getCategories() {
  const [overrides, counts, hidden] = await Promise.all([
    prisma.marketCategory.findMany(),
    prisma.product.groupBy({ by: ["department"], _count: { _all: true } }),
    prisma.product.groupBy({ by: ["department"], where: { isAvailable: false }, _count: { _all: true } }),
  ]);

  const map = new Map(overrides.map((o) => [o.department, o]));
  const countMap = new Map(counts.map((c) => [String(c.department ?? "OUTRO"), c._count._all]));
  const hiddenMap = new Map(hidden.map((c) => [String(c.department ?? "OUTRO"), c._count._all]));

  return DEPARTMENTS.map((d, i) => {
    const o = map.get(d.value);
    return {
      department: d.value,
      label: o?.label ?? d.label,
      icon: o?.icon ?? d.icon,
      isActive: o ? o.isActive : true,
      sortOrder: o ? o.sortOrder : i,
      subcategories: o?.subcategories ?? [],
      products: countMap.get(d.value) ?? 0,
      hiddenProducts: hiddenMap.get(d.value) ?? 0,
      customized: !!o,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveCategory(admin: AdminSnapshot, department: string, input: any) {
  const def = DEPARTMENTS.find((d) => d.value === department);
  if (!def) {
    throw new Error("Departamento inválido.");
  }

  const label = clean(input?.label, 40) ?? def.label;
  const icon = clean(input?.icon, 8) ?? def.icon;
  const sortOrder = input?.sortOrder !== undefined ? Math.floor(Number(input.sortOrder)) : 0;
  if (isNaN(sortOrder) || sortOrder < 0 || sortOrder > 99) {
    throw new Error("A ordem deve ser um número de 0 a 99.");
  }

  const subs = Array.isArray(input?.subcategories)
    ? (Array.from(new Set(input.subcategories.map((s: any) => String(s).trim()).filter(Boolean))) as string[]).slice(0, 40)
    : [];
  if (subs.some((s) => s.length > 40)) {
    throw new Error("Cada subcategoria aceita até 40 letras.");
  }

  const data = { label, icon, isActive: input?.isActive !== false, sortOrder, subcategories: subs, updatedBy: admin.userId };
  await prisma.marketCategory.upsert({ where: { department }, create: { department, ...data }, update: data });
  await logAudit(admin.userId, "CATEGORY_EDIT", { type: "CATEGORY", id: department }, `Editou a categoria ${label}`, { isActive: data.isActive, subcategories: subs.length });

  return getCategories();
}

// =====================================================================
// Para todas as pessoas (o app usa-os ao publicar e na página inicial)
// =====================================================================
export async function publicCategories() {
  return (await getCategories()).filter((c) => c.isActive).map((c) => ({ department: c.department, label: c.label, icon: c.icon, subcategories: c.subcategories }));
}

export async function publicFeatured() {
  const rows = await featuredRows();
  return rows.map((r) => ({ productId: r.refId, endsAt: r.endsAt }));
}
