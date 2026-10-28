import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean, plain, safe } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { BUYER_ROLES, isStorageUrl } from "../lib/adminUserCatalog";
import { anyModel, byNewest, ownerOf, readAll, titleOf } from "../lib/anyModel";
import { AUDIENCES, BANNER_LINKS, EVENT_GROUPS, HIDE_KINDS, HIGHLIGHT_KINDS } from "../lib/adminContentCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const DAY = 86400000;
const PAGE_SIZE = 25;
const MAX_BANNERS = 10;
const MAX_HIGHLIGHTS = 10;
const HIDE_VALUES = values(HIDE_KINDS);
const HIGHLIGHT_VALUES = values(HIGHLIGHT_KINDS);
const AUDIENCE_VALUES = values(AUDIENCES);
const LINK_VALUES = values(BANNER_LINKS);
const REGION_KEYS = REGIONS.map((r) => r.key);

function models() {
  return {
    PUBLICATION: prisma.publication as any,
    OPPORTUNITY: prisma.opportunity as any,
    PROJECT: prisma.ngoProject as any,
    LEARNING: anyModel("learningItem", "learning", "learningContent"),
    EVENT: anyModel("event", "events"),
    POST: anyModel("communityPost", "post"),
  } as Record<string, any>;
}

const HIGHLIGHT_MODEL: Record<string, string> = { PUBLICACAO: "PUBLICATION", CURSO: "LEARNING", EVENTO: "EVENT" };

async function namesOf(ids: string[]) {
  const list = Array.from(new Set(ids.filter(Boolean)));
  const users = list.length ? await prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, name: true } }) : [];
  return new Map(users.map((u) => [u.id, u.name]));
}

// =====================================================================
// Banners
// =====================================================================
function bannerState(b: any, now: Date): string {
  if (!b.isActive) return "OFF";
  if (new Date(b.endsAt) <= now) return "ENDED";
  if (new Date(b.startsAt) > now) return "SCHEDULED";
  return "ACTIVE";
}

export async function listBanners(filters: { status?: string }) {
  const rows = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 200 });
  const now = new Date();
  const items = rows.map((b) => ({ ...b, state: bannerState(b, now), regions: b.regionKeys.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k) }));

  const counts: Record<string, number> = {};
  items.forEach((b) => (counts[b.state] = (counts[b.state] ?? 0) + 1));

  return { counts, max: MAX_BANNERS, items: filters.status ? items.filter((b) => b.state === filters.status) : items };
}

export async function saveBanner(admin: AdminSnapshot, id: string | null, input: any) {
  const title = clean(input?.title, 80);
  if (!title || title.length < 3) {
    throw new Error("Escreva o título (pelo menos 3 letras).");
  }

  const imageUrl = input?.imageUrl ? String(input.imageUrl) : null;
  if (imageUrl && !isStorageUrl(imageUrl)) {
    throw new Error("Imagem inválida. Envie a imagem pelo app.");
  }

  const linkKind = String(input?.linkKind ?? "NONE");
  if (!LINK_VALUES.includes(linkKind)) {
    throw new Error("Tipo de ligação inválido.");
  }
  let linkTarget: string | null = null;
  if (linkKind === "SCREEN") {
    linkTarget = String(input?.linkTarget ?? "").trim();
    if (!/^[A-Za-z]{3,40}$/.test(linkTarget)) throw new Error("Indique o nome da tela do app (só letras).");
  } else if (linkKind === "URL") {
    linkTarget = String(input?.linkTarget ?? "").trim();
    if (!/^https:\/\/\S{4,300}$/i.test(linkTarget)) throw new Error("O endereço deve começar por https://");
  }

  const audiences = Array.isArray(input?.audiences) ? (Array.from(new Set(input.audiences.map(String))) as string[]) : [];
  const regionKeys = Array.isArray(input?.regionKeys) ? (Array.from(new Set(input.regionKeys.map(String))) as string[]) : [];
  if (!audiences.every((a) => AUDIENCE_VALUES.includes(a)) || !regionKeys.every((r) => REGION_KEYS.includes(r))) {
    throw new Error("Público ou região inválidos.");
  }

  const startsAt = input?.startsAt ? new Date(input.startsAt) : new Date();
  const endsAt = input?.endsAt ? new Date(input.endsAt) : null;
  if (isNaN(startsAt.getTime()) || !endsAt || isNaN(endsAt.getTime())) {
    throw new Error("Indique até quando o banner aparece.");
  }
  if (endsAt <= startsAt) {
    throw new Error("A data de fim deve ser depois da de início.");
  }
  if (endsAt.getTime() - startsAt.getTime() > 180 * DAY) {
    throw new Error("Um banner pode durar no máximo 180 dias.");
  }

  const sortOrder = Math.floor(Number(input?.sortOrder ?? 0));
  if (isNaN(sortOrder) || sortOrder < 0 || sortOrder > 99) {
    throw new Error("A ordem deve ser um número de 0 a 99.");
  }
  const isActive = input?.isActive !== false;

  if (isActive) {
    const active = await prisma.banner.count({ where: { isActive: true, endsAt: { gt: new Date() }, ...(id ? { id: { not: id } } : {}) } });
    if (active >= MAX_BANNERS) {
      throw new Error(`Já há ${MAX_BANNERS} banners ativos. Termine algum antes.`);
    }
  }

  const data = {
    title,
    body: clean(input?.body, 200),
    imageUrl,
    linkKind,
    linkTarget,
    audiences: audiences.includes("TODOS") ? [] : audiences,
    regionKeys,
    startsAt,
    endsAt,
    isActive,
    sortOrder,
  };

  let banner;
  if (id) {
    const found = await prisma.banner.findUnique({ where: { id } });
    if (!found) throw new Error("Banner não encontrado.");
    banner = await prisma.banner.update({ where: { id }, data });
  } else {
    banner = await prisma.banner.create({ data: { ...data, createdBy: admin.userId } });
  }

  await logAudit(admin.userId, "BANNER_SAVE", { type: "BANNER", id: banner.id }, `${id ? "Editou" : "Criou"} o banner "${title}"`);
  return banner;
}

export async function deleteBanner(admin: AdminSnapshot, id: string) {
  const b = await prisma.banner.findUnique({ where: { id } });
  if (!b) {
    throw new Error("Banner não encontrado.");
  }
  await prisma.banner.delete({ where: { id } });
  await logAudit(admin.userId, "BANNER_DELETE", { type: "BANNER", id }, `Apagou o banner "${b.title}"`);
  return { id, deleted: true };
}

// Para a página inicial das pessoas
export async function publicBanners(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, location: true } });
  if (!user) return [];

  const now = new Date();
  const rows = await prisma.banner.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: MAX_BANNERS,
  });

  const mine = BUYER_ROLES.includes(String(user.role)) ? "CLIENTE" : String(user.role);
  const region = findRegion(user.location)?.key ?? null;

  return rows
    .filter((b) => (b.audiences.length === 0 || b.audiences.includes(mine)) && (b.regionKeys.length === 0 || (!!region && b.regionKeys.includes(region))))
    .map((b) => ({ id: b.id, title: b.title, body: b.body, imageUrl: b.imageUrl, linkKind: b.linkKind, linkTarget: b.linkTarget }));
}

// =====================================================================
// Destaques (publicações, cursos e eventos; os produtos têm os seus)
// =====================================================================
export async function listHighlights(kind?: string) {
  const now = new Date();
  const where: any = { endsAt: { gt: now }, kind: kind && HIGHLIGHT_VALUES.includes(kind) ? kind : { in: HIGHLIGHT_VALUES } };
  const rows = await prisma.highlight.findMany({ where, orderBy: { endsAt: "asc" }, take: 100 });

  const registry = models();
  const items = await Promise.all(
    rows.map(async (h) => {
      const delegate = registry[HIGHLIGHT_MODEL[h.kind]];
      const row = delegate ? await safe("destaque", () => delegate.findUnique({ where: { id: h.refId } }), null as any) : null;
      return { id: h.id, kind: h.kind, refId: h.refId, title: row ? titleOf(row) : h.label ?? "Conteúdo removido", endsAt: h.endsAt, missing: !row };
    })
  );

  return { max: MAX_HIGHLIGHTS, items };
}

export async function saveHighlight(admin: AdminSnapshot, input: any) {
  const kind = String(input?.kind ?? "");
  const refId = String(input?.refId ?? "");
  if (!HIGHLIGHT_VALUES.includes(kind) || !refId) {
    throw new Error("Escolha o conteúdo a pôr em destaque.");
  }

  const delegate = models()[HIGHLIGHT_MODEL[kind]];
  const row = delegate ? await safe("conteúdo", () => delegate.findUnique({ where: { id: refId } }), null as any) : null;
  if (!row) {
    throw new Error("Conteúdo não encontrado.");
  }

  const hidden = await prisma.contentVisibility.findUnique({ where: { kind_refId: { kind: HIGHLIGHT_MODEL[kind], refId } } });
  if (hidden?.hidden) {
    throw new Error("Este conteúdo está escondido. Reponha-o antes de o pôr em destaque.");
  }

  const days = Math.floor(Number(input?.days ?? 14));
  if (isNaN(days) || days < 1 || days > 90) {
    throw new Error("Indique por quantos dias (de 1 a 90).");
  }

  const now = new Date();
  const active = await prisma.highlight.findMany({ where: { kind, endsAt: { gt: now } } });
  const current = active.find((h) => h.refId === refId);
  if (!current && active.length >= MAX_HIGHLIGHTS) {
    throw new Error(`Já há ${MAX_HIGHLIGHTS} destaques deste tipo. Termine algum antes.`);
  }

  const endsAt = new Date(now.getTime() + days * DAY);
  const label = clean(input?.label, 80) ?? titleOf(row);
  if (current) await prisma.highlight.update({ where: { id: current.id }, data: { endsAt, label } });
  else await prisma.highlight.create({ data: { kind, refId, label, endsAt, createdBy: admin.userId } });

  await logAudit(admin.userId, "HIGHLIGHT_SAVE", { type: HIGHLIGHT_MODEL[kind], id: refId }, `Pôs "${label}" em destaque por ${days} dia(s)`);
  return listHighlights(kind);
}

export async function removeHighlight(admin: AdminSnapshot, id: string) {
  const h = await prisma.highlight.findUnique({ where: { id } });
  if (!h || !HIGHLIGHT_VALUES.includes(h.kind)) {
    throw new Error("Destaque não encontrado.");
  }
  await prisma.highlight.update({ where: { id }, data: { endsAt: new Date() } });
  await logAudit(admin.userId, "HIGHLIGHT_SAVE", { type: HIGHLIGHT_MODEL[h.kind], id: h.refId }, `Tirou "${h.label ?? "um conteúdo"}" dos destaques`);
  return { id, removed: true };
}

// Para a página inicial: os destaques de cada tipo (inclui os produtos)
export async function publicHighlights(kind?: string) {
  const now = new Date();
  const rows = await prisma.highlight.findMany({ where: { startsAt: { lte: now }, endsAt: { gt: now }, ...(kind ? { kind } : {}) }, orderBy: { endsAt: "asc" }, take: 100 });
  return rows.map((h) => ({ kind: h.kind, refId: h.refId, label: h.label, endsAt: h.endsAt }));
}

// =====================================================================
// Conteúdos: listar, esconder e repor
// =====================================================================
export async function listContent(kind: string, filters: { q?: string; status?: string; page?: number }) {
  if (!HIDE_VALUES.includes(kind)) {
    throw new Error("Tipo de conteúdo inválido.");
  }

  const delegate = models()[kind];
  const [rows, hidden, featured] = await Promise.all([
    readAll(delegate, 3000),
    prisma.contentVisibility.findMany({ where: { kind, hidden: true } }),
    prisma.highlight.findMany({ where: { endsAt: { gt: new Date() } } }),
  ]);
  const hiddenMap = new Map(hidden.map((h) => [h.refId, h]));
  const featuredIds = new Set(featured.map((f) => f.refId));
  const names = await namesOf(rows.map(ownerOf));

  const needle = plain(filters.q);
  let list = rows.sort(byNewest);
  if (needle) list = list.filter((r) => plain(`${titleOf(r)} ${r.description ?? r.body ?? ""}`).includes(needle));
  if (filters.status === "hidden") list = list.filter((r) => hiddenMap.has(r.id));
  if (filters.status === "visible") list = list.filter((r) => !hiddenMap.has(r.id));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    kind,
    available: !!delegate,
    summary: { all: rows.length, hidden: rows.filter((r) => hiddenMap.has(r.id)).length },
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => ({
      id: r.id,
      title: titleOf(r),
      type: r.category ?? r.type ?? r.kind ?? null,
      owner: names.get(ownerOf(r)) ?? null,
      createdAt: r.createdAt ?? null,
      hidden: hiddenMap.has(r.id),
      hiddenReason: hiddenMap.get(r.id)?.reason ?? null,
      featured: featuredIds.has(r.id),
    })),
  };
}

export async function setHidden(admin: AdminSnapshot, input: any, hidden: boolean) {
  const kind = String(input?.kind ?? "");
  const refId = String(input?.refId ?? "");
  if (!HIDE_VALUES.includes(kind) || !refId) {
    throw new Error("Conteúdo inválido.");
  }

  const reason = clean(input?.reason, 300);
  if (!reason || reason.length < 5) {
    throw new Error("Explique o motivo (pelo menos 5 letras). O autor vê esta explicação.");
  }

  const delegate = models()[kind];
  const row = delegate ? await safe("conteúdo", () => delegate.findUnique({ where: { id: refId } }), null as any) : null;
  if (!row) {
    throw new Error("Conteúdo não encontrado.");
  }
  const title = titleOf(row);

  await prisma.contentVisibility.upsert({
    where: { kind_refId: { kind, refId } },
    create: { kind, refId, hidden, reason, hiddenBy: admin.userId },
    update: { hidden, reason, hiddenBy: admin.userId, updatedAt: new Date() },
  });
  if (hidden) {
    await prisma.highlight.updateMany({ where: { refId, endsAt: { gt: new Date() } }, data: { endsAt: new Date() } });
  }

  const owner = ownerOf(row);
  if (owner) {
    await prisma.notification.create({
      data: {
        userId: owner,
        type: "SISTEMA",
        title: hidden ? "Um conteúdo seu foi escondido" : "Um conteúdo seu voltou a aparecer",
        message: `"${title}": ${reason}`.slice(0, 300),
        relatedId: refId,
      },
    });
  }

  await logAudit(admin.userId, hidden ? "CONTENT_HIDE" : "CONTENT_RESTORE", { type: kind, id: refId }, `${hidden ? "Escondeu" : "Repôs"} "${title}": ${reason}`);
  return { kind, refId, hidden };
}

// =====================================================================
// Eventos
// =====================================================================
function eventDate(e: any): Date | null {
  const v = e.startsAt ?? e.startDate ?? e.date ?? e.startAt ?? e.eventDate ?? null;
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function eventGroup(e: any): string {
  const text = plain(`${e.type ?? ""} ${e.kind ?? ""} ${e.category ?? ""} ${e.title ?? e.name ?? ""}`);
  if (text.includes("feira")) return "FEIRA";
  if (/(formac|curso|workshop|capacit|treino)/.test(text)) return "FORMACAO";
  if (text.includes("campanha")) return "CAMPANHA";
  return "OUTRO";
}

function registrations() {
  return anyModel("eventRegistration", "eventRegistrations", "eventParticipant", "eventAttendee");
}

export async function listEvents(filters: { group?: string; when?: string; status?: string; q?: string; page?: number }) {
  const [rows, regs, hidden] = await Promise.all([
    readAll(models().EVENT, 2000),
    readAll(registrations(), 20000),
    prisma.contentVisibility.findMany({ where: { kind: "EVENT", hidden: true } }),
  ]);
  const hiddenMap = new Map(hidden.map((h) => [h.refId, h]));
  const regCount = new Map<string, number>();
  regs.forEach((r) => r.eventId && regCount.set(r.eventId, (regCount.get(r.eventId) ?? 0) + 1));
  const names = await namesOf(rows.map(ownerOf));

  const now = Date.now();
  const all = rows.map((e) => {
    const date = eventDate(e);
    return {
      id: e.id,
      title: titleOf(e),
      group: eventGroup(e),
      date,
      upcoming: !date || date.getTime() >= now - DAY,
      location: e.location ?? e.place ?? e.address ?? null,
      region: e.region ?? null,
      organizer: names.get(ownerOf(e)) ?? null,
      participants: regCount.get(e.id) ?? 0,
      capacity: e.capacity ?? e.maxParticipants ?? e.spots ?? null,
      hidden: hiddenMap.has(e.id),
      hiddenReason: hiddenMap.get(e.id)?.reason ?? null,
      createdAt: e.createdAt ?? null,
    };
  });

  const counts: Record<string, number> = { FEIRA: 0, FORMACAO: 0, CAMPANHA: 0, OUTRO: 0 };
  all.forEach((e) => (counts[e.group] += 1));

  const needle = plain(filters.q);
  let list = all;
  if (filters.group && EVENT_GROUPS.some((g) => g.value === filters.group)) list = list.filter((e) => e.group === filters.group);
  if (filters.when === "upcoming") list = list.filter((e) => e.upcoming);
  if (filters.when === "past") list = list.filter((e) => !e.upcoming);
  if (filters.status === "hidden") list = list.filter((e) => e.hidden);
  if (filters.status === "visible") list = list.filter((e) => !e.hidden);
  if (needle) list = list.filter((e) => plain(`${e.title} ${e.location} ${e.organizer}`).includes(needle));
  list.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    available: !!models().EVENT,
    summary: { all: all.length, upcoming: all.filter((e) => e.upcoming && !e.hidden).length, hidden: all.filter((e) => e.hidden).length, participants: all.reduce((s, e) => s + e.participants, 0) },
    groups: counts,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function getEvent(id: string) {
  const delegate = models().EVENT;
  const e = delegate ? await safe("evento", () => delegate.findUnique({ where: { id } }), null as any) : null;
  if (!e) {
    throw new Error("Evento não encontrado.");
  }

  const regModel = registrations();
  const regs: any[] = regModel ? await safe("inscrições", () => regModel.findMany({ where: { eventId: id }, take: 1000 }), [] as any[]) : [];
  const userIds = Array.from(new Set(regs.map((r) => r.userId ?? r.participantId).filter(Boolean))) as string[];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true, role: true, location: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const [hidden, audit, organizer] = await Promise.all([
    prisma.contentVisibility.findUnique({ where: { kind_refId: { kind: "EVENT", refId: id } } }),
    prisma.adminAudit.findMany({ where: { targetType: "EVENT", targetId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ownerOf(e) ? prisma.user.findUnique({ where: { id: ownerOf(e) }, select: { id: true, name: true, role: true } }) : Promise.resolve(null),
  ]);
  const adminNames = await namesOf(audit.map((a) => a.adminId));

  return {
    event: {
      id: e.id,
      title: titleOf(e),
      description: e.description ?? e.body ?? null,
      group: eventGroup(e),
      date: eventDate(e),
      location: e.location ?? e.place ?? e.address ?? null,
      region: e.region ?? null,
      capacity: e.capacity ?? e.maxParticipants ?? e.spots ?? null,
      hidden: !!hidden?.hidden,
      hiddenReason: hidden?.hidden ? hidden.reason : null,
    },
    organizer,
    participants: regs.map((r) => {
      const u = userMap.get(r.userId ?? r.participantId);
      return { id: r.id, userId: u?.id ?? null, name: u?.name ?? "Participante", phone: u?.phone ?? null, location: u?.location ?? null, registeredAt: r.createdAt ?? null };
    }),
    history: audit.map((a) => ({ ...a, adminName: adminNames.get(a.adminId) ?? "Administrador" })),
  };
}

async function participantIds(eventId: string): Promise<string[]> {
  const regModel = registrations();
  const regs: any[] = regModel ? await safe("inscrições", () => regModel.findMany({ where: { eventId }, take: 5000 }), [] as any[]) : [];
  return Array.from(new Set(regs.map((r) => r.userId ?? r.participantId).filter(Boolean))) as string[];
}

export async function cancelEvent(admin: AdminSnapshot, id: string, reasonInput: any) {
  const current = await getEvent(id);
  if (current.event.hidden) {
    throw new Error("Este evento já está cancelado.");
  }

  await setHidden(admin, { kind: "EVENT", refId: id, reason: reasonInput }, true);
  const reason = clean(reasonInput, 300) as string;

  const ids = await participantIds(id);
  if (ids.length > 0) {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type: "SISTEMA" as const, title: "Evento cancelado", message: `"${current.event.title}" foi cancelado. ${reason}`.slice(0, 300), relatedId: id })),
    });
  }
  await logAudit(admin.userId, "EVENT_CANCEL", { type: "EVENT", id }, `Cancelou o evento "${current.event.title}" (${ids.length} participante(s) avisado(s))`);
  return getEvent(id);
}

export async function restoreEvent(admin: AdminSnapshot, id: string, reasonInput: any) {
  const current = await getEvent(id);
  if (!current.event.hidden) {
    throw new Error("Este evento não está cancelado.");
  }
  await setHidden(admin, { kind: "EVENT", refId: id, reason: reasonInput }, false);
  await logAudit(admin.userId, "EVENT_RESTORE", { type: "EVENT", id }, `Repôs o evento "${current.event.title}"`);
  return getEvent(id);
}

export async function notifyEventParticipants(admin: AdminSnapshot, id: string, messageInput: any) {
  const current = await getEvent(id);
  const message = clean(messageInput, 300);
  if (!message || message.length < 5) {
    throw new Error("Escreva a mensagem (pelo menos 5 letras).");
  }

  const ids = await participantIds(id);
  if (ids.length === 0) {
    throw new Error("Este evento ainda não tem participantes inscritos.");
  }

  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, type: "SISTEMA" as const, title: `Sobre o evento "${current.event.title}"`.slice(0, 80), message, relatedId: id })),
  });
  await logAudit(admin.userId, "EVENT_NOTIFY", { type: "EVENT", id }, `Avisou ${ids.length} participante(s) do evento "${current.event.title}"`);
  return { id, notified: ids.length };
}
