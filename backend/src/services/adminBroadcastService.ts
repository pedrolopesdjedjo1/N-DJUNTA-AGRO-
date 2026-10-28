import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { getSetting } from "../lib/platformSettings";
import { BUYER_ROLES, ROLE_VALUES } from "../lib/adminUserCatalog";
import { ALERT_KINDS, AUDIENCES, BROADCAST_KINDS, SEVERITIES } from "../lib/adminContentCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const DAY = 86400000;
const PAGE_SIZE = 25;
const MAX_PER_DAY = 20;
const EMERGENCY_MAX = 50000;
const SEVERITY_RANK: Record<string, number> = { INFO: 0, ATENCAO: 1, ALERTA: 2, EMERGENCIA: 3 };
const KIND_VALUES = values(BROADCAST_KINDS);
const AUDIENCE_VALUES = values(AUDIENCES);
const SEVERITY_VALUES = values(SEVERITIES);
const REGION_KEYS = REGIONS.map((r) => r.key);
const ALL_ROLES = ROLE_VALUES.filter((r) => r !== "ADMIN");

function rolesFor(audiences: string[]): string[] {
  if (audiences.length === 0 || audiences.includes("TODOS")) return ALL_ROLES;

  const out = new Set<string>();
  audiences.forEach((a) => {
    if (a === "CLIENTE") BUYER_ROLES.forEach((r) => out.add(r));
    else out.add(a);
  });
  return Array.from(out).filter((r) => ALL_ROLES.includes(r));
}

function readLists(input: any) {
  const audiences = Array.isArray(input?.audiences) ? (Array.from(new Set(input.audiences.map(String))) as string[]) : [];
  const regionKeys = Array.isArray(input?.regionKeys) ? (Array.from(new Set(input.regionKeys.map(String))) as string[]) : [];

  if (!audiences.every((a) => AUDIENCE_VALUES.includes(a))) throw new Error("Público inválido.");
  if (!regionKeys.every((r) => REGION_KEYS.includes(r))) throw new Error("Região inválida.");
  return { audiences: audiences.includes("TODOS") ? [] : audiences, regionKeys };
}

// Quem recebe um aviso: contas ativas dos perfis e das regiões escolhidos
export async function audienceIds(audiences: string[], regionKeys: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: rolesFor(audiences) as any } },
    select: { id: true, location: true },
    take: 60000,
  });

  return users.filter((u) => regionKeys.length === 0 || (findRegion(u.location)?.key && regionKeys.includes(findRegion(u.location)!.key))).map((u) => u.id);
}

async function limitFor(kind: string): Promise<number> {
  return kind === "EMERGENCIA" ? EMERGENCY_MAX : await getSetting<number>("notifications.maxBroadcastRecipients");
}

function checkKind(admin: AdminSnapshot, kind: string) {
  if (!KIND_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de aviso.");
  }
  const alert = ALERT_KINDS.includes(kind);
  if (alert && !admin.permissions.has("alerts.manage")) {
    throw new Error("Não tem permissão para criar alertas.");
  }
  if (!alert && !admin.permissions.has("notify.send")) {
    throw new Error("Não tem permissão para enviar avisos.");
  }
  return alert;
}

// Quantas pessoas recebem, antes de enviar
export async function previewBroadcast(admin: AdminSnapshot, input: any) {
  const kind = String(input?.kind ?? "GERAL");
  checkKind(admin, kind);

  const lists = kind === "GERAL" || kind === "EMERGENCIA" ? { audiences: [] as string[], regionKeys: [] as string[] } : readLists(input);
  const merged = kind === "EMERGENCIA" ? readLists(input) : lists;
  const ids = await audienceIds(merged.audiences, merged.regionKeys);
  const max = await limitFor(kind);

  return { recipients: ids.length, max, tooMany: ids.length > max, requiresConfirm: kind === "EMERGENCIA" || (merged.audiences.length === 0 && merged.regionKeys.length === 0) };
}

export async function sendBroadcast(admin: AdminSnapshot, input: any) {
  const kind = String(input?.kind ?? "");
  const isAlert = checkKind(admin, kind);

  const title = clean(input?.title, 80);
  if (!title || title.length < 3) {
    throw new Error("Escreva o título (pelo menos 3 letras).");
  }
  const message = clean(input?.message, 300);
  if (!message || message.length < 10) {
    throw new Error("Escreva a mensagem (pelo menos 10 letras).");
  }

  let lists = kind === "GERAL" ? { audiences: [] as string[], regionKeys: [] as string[] } : readLists(input);
  if (kind === "REGIAO" && lists.regionKeys.length === 0) {
    throw new Error("Escolha pelo menos uma região.");
  }
  if (kind === "PERFIL" && lists.audiences.length === 0) {
    throw new Error("Escolha pelo menos um perfil.");
  }

  const severity = kind === "EMERGENCIA" ? "EMERGENCIA" : input?.severity ? String(input.severity) : isAlert ? "ALERTA" : "INFO";
  if (!SEVERITY_VALUES.includes(severity)) {
    throw new Error("Nível de gravidade inválido.");
  }

  let endsAt: Date | null = null;
  if (isAlert) {
    const hours = Math.floor(Number(input?.hours ?? 24));
    if (isNaN(hours) || hours < 1 || hours > 336) {
      throw new Error("Indique durante quantas horas o alerta fica ativo (de 1 a 336).");
    }
    endsAt = new Date(Date.now() + hours * 3600000);
  }

  const sentToday = await prisma.adminBroadcast.count({ where: { createdBy: admin.userId, createdAt: { gte: new Date(Date.now() - DAY) } } });
  if (sentToday >= MAX_PER_DAY) {
    throw new Error(`Já enviou ${MAX_PER_DAY} avisos nas últimas 24 horas.`);
  }

  const ids = await audienceIds(lists.audiences, lists.regionKeys);
  if (ids.length === 0) {
    throw new Error("Ninguém corresponde a este público e a estas regiões.");
  }
  const max = await limitFor(kind);
  if (ids.length > max) {
    throw new Error(`Este aviso chega a ${ids.length} pessoas e o limite é ${max}. Escolha um público ou regiões mais pequenos.`);
  }

  const wide = lists.audiences.length === 0 && lists.regionKeys.length === 0;
  if ((kind === "EMERGENCIA" || wide) && input?.confirm !== true) {
    throw new Error(`Este aviso chega a ${ids.length} pessoas. Confirme o envio.`);
  }

  const broadcast = await prisma.adminBroadcast.create({
    data: { kind, title, message, audiences: lists.audiences, regionKeys: lists.regionKeys, isAlert, severity, endsAt, sentCount: ids.length, createdBy: admin.userId },
  });

  const prefix = severity === "EMERGENCIA" ? "🚨 " : isAlert ? "⚠️ " : "";
  for (let i = 0; i < ids.length; i += 1000) {
    await prisma.notification.createMany({
      data: ids.slice(i, i + 1000).map((userId) => ({ userId, type: "SISTEMA" as const, title: `${prefix}${title}`, message, relatedId: broadcast.id })),
    });
  }

  await logAudit(admin.userId, isAlert ? "ALERT_CREATE" : "BROADCAST_SEND", { type: "BROADCAST", id: broadcast.id }, `${isAlert ? "Criou o alerta" : "Enviou o aviso"} "${title}" a ${ids.length} pessoa(s)`, {
    kind,
    audiences: lists.audiences,
    regions: lists.regionKeys,
  });

  return broadcast;
}

export async function listBroadcasts(filters: { kind?: string; alerts?: string; status?: string; page?: number }) {
  const now = new Date();
  const where: any = {};
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.alerts === "true") where.isAlert = true;
  if (filters.alerts === "false") where.isAlert = false;
  if (filters.status === "active") {
    where.isAlert = true;
    where.endedAt = null;
    where.OR = [{ endsAt: null }, { endsAt: { gt: now } }];
  }

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.adminBroadcast.count({ where }),
    prisma.adminBroadcast.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  const people = rows.length ? await prisma.user.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.createdBy))) } }, select: { id: true, name: true } }) : [];
  const names = new Map(people.map((p) => [p.id, p.name]));

  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((b) => ({
      ...b,
      active: b.isAlert && !b.endedAt && (!b.endsAt || b.endsAt > now),
      regions: b.regionKeys.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k),
      authorName: names.get(b.createdBy) ?? "Administrador",
    })),
  };
}

// =====================================================================
// Clima e alertas
// =====================================================================
function officialActive(a: any, now: Date) {
  return !!a.isActive && new Date(a.startsAt) <= now && (!a.expiresAt || new Date(a.expiresAt) > now);
}

export async function alertsOverview(filters: { status?: string; type?: string; kind?: string }) {
  const now = new Date();
  const [broadcasts, official, users] = await Promise.all([
    prisma.adminBroadcast.findMany({ where: { isAlert: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.officialAlert.findMany({
      orderBy: { startsAt: "desc" },
      take: 200,
      select: { id: true, title: true, severity: true, kind: true, regions: true, isActive: true, startsAt: true, expiresAt: true },
    }),
    prisma.user.findMany({ where: { isActive: true, role: { in: ALL_ROLES as any } }, select: { location: true }, take: 60000 }),
  ]);

  const people = new Map<string, number>();
  users.forEach((u) => {
    const key = findRegion(u.location)?.key;
    if (key) people.set(key, (people.get(key) ?? 0) + 1);
  });

  const rows = [
    ...broadcasts.map((b) => ({
      source: "ADMIN",
      id: b.id,
      kind: b.kind,
      severity: b.severity,
      title: b.title,
      message: b.message,
      regionKeys: b.regionKeys,
      audiences: b.audiences,
      startsAt: b.createdAt,
      endsAt: b.endsAt,
      active: !b.endedAt && (!b.endsAt || b.endsAt > now),
      sentCount: b.sentCount,
    })),
    ...official.map((a) => ({
      source: "OFICIAL",
      id: a.id,
      kind: String(a.kind),
      severity: String(a.severity),
      title: a.title,
      message: null as string | null,
      regionKeys: a.regions,
      audiences: [] as string[],
      startsAt: a.startsAt,
      endsAt: a.expiresAt,
      active: officialActive(a, now),
      sentCount: null as number | null,
    })),
  ].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  // Regiões afetadas pelos alertas ativos
  const affected = new Map<string, { key: string; name: string; alerts: number; maxSeverity: string; people: number }>();
  rows
    .filter((r) => r.active)
    .forEach((r) => {
      const keys = r.regionKeys.length === 0 ? REGION_KEYS : r.regionKeys;
      keys.forEach((key) => {
        const region = REGIONS.find((x) => x.key === key);
        if (!region) return;
        const row = affected.get(key) ?? { key, name: region.name, alerts: 0, maxSeverity: "INFO", people: people.get(key) ?? 0 };
        row.alerts += 1;
        if ((SEVERITY_RANK[r.severity] ?? 0) > (SEVERITY_RANK[row.maxSeverity] ?? 0)) row.maxSeverity = r.severity;
        affected.set(key, row);
      });
    });

  let list = rows;
  if (filters.status === "active") list = list.filter((r) => r.active);
  if (filters.status === "ended") list = list.filter((r) => !r.active);
  if (filters.type === "admin") list = list.filter((r) => r.source === "ADMIN");
  if (filters.type === "official") list = list.filter((r) => r.source === "OFICIAL");
  if (filters.kind) list = list.filter((r) => r.kind === filters.kind);

  return {
    summary: {
      active: rows.filter((r) => r.active).length,
      emergencies: rows.filter((r) => r.active && r.severity === "EMERGENCIA").length,
      official: rows.filter((r) => r.active && r.source === "OFICIAL").length,
      byTeam: rows.filter((r) => r.active && r.source === "ADMIN").length,
    },
    affectedRegions: Array.from(affected.values()).sort((a, b) => (SEVERITY_RANK[b.maxSeverity] ?? 0) - (SEVERITY_RANK[a.maxSeverity] ?? 0) || b.people - a.people),
    items: list.slice(0, 100).map((r) => ({ ...r, regions: r.regionKeys.map((k) => REGIONS.find((x) => x.key === k)?.name ?? k) })),
    note: "Os alertas oficiais vêm das instituições. Os da equipa chegam como notificação e aparecem na página inicial enquanto estiverem ativos.",
  };
}

export async function endAlert(admin: AdminSnapshot, id: string, input: any) {
  const b = await prisma.adminBroadcast.findUnique({ where: { id } });
  if (!b || !b.isAlert) {
    throw new Error("Alerta não encontrado.");
  }
  if (b.endedAt) {
    throw new Error("Este alerta já terminou.");
  }

  await prisma.adminBroadcast.update({ where: { id }, data: { endedAt: new Date(), endedBy: admin.userId } });

  if (input?.notify === true) {
    const ids = await audienceIds(b.audiences, b.regionKeys);
    for (let i = 0; i < ids.length; i += 1000) {
      await prisma.notification.createMany({
        data: ids.slice(i, i + 1000).map((userId) => ({ userId, type: "SISTEMA" as const, title: `Alerta terminado: ${b.title}`, message: "O alerta já não está ativo.", relatedId: id })),
      });
    }
  }
  await logAudit(admin.userId, "ALERT_END", { type: "BROADCAST", id }, `Terminou o alerta "${b.title}"`);
  return { id, ended: true };
}

export async function endOfficialAlert(admin: AdminSnapshot, id: string) {
  const a = await prisma.officialAlert.findUnique({ where: { id }, select: { id: true, title: true, isActive: true } });
  if (!a) {
    throw new Error("Alerta não encontrado.");
  }
  if (!a.isActive) {
    throw new Error("Este alerta já terminou.");
  }

  await prisma.officialAlert.update({ where: { id }, data: { isActive: false } });
  await logAudit(admin.userId, "ALERT_END", { type: "ALERT", id }, `Terminou o alerta oficial "${a.title}"`);
  return { id, ended: true };
}

// Para a página inicial das pessoas: os alertas da equipa ativos para o seu perfil e a sua região
export async function alertFeed(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, location: true } });
  if (!user) return [];

  const now = new Date();
  const rows = await prisma.adminBroadcast.findMany({
    where: { isAlert: true, endedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const mine = BUYER_ROLES.includes(String(user.role)) ? "CLIENTE" : String(user.role);
  const region = findRegion(user.location)?.key ?? null;

  return rows
    .filter((b) => (b.audiences.length === 0 || b.audiences.includes(mine)) && (b.regionKeys.length === 0 || (!!region && b.regionKeys.includes(region))))
    .slice(0, 10)
    .map((b) => ({ id: b.id, kind: b.kind, severity: b.severity, title: b.title, message: b.message, endsAt: b.endsAt, createdAt: b.createdAt }));
}
