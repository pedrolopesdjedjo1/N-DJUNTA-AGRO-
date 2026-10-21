import { prisma } from "../lib/prisma";
import { ALERT_KINDS, ALERT_SEVERITY } from "../lib/govCatalog";
import { values } from "../lib/ngoCatalog";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { orgInfo } from "../lib/ngoOrgInfo";
import { notifyMany, usersInRegions } from "../lib/regionAudience";
import { assertGov } from "./organizationService";

const KIND_VALUES = values(ALERT_KINDS);
const SEVERITY_VALUES = values(ALERT_SEVERITY);
const REGION_KEYS = REGIONS.map((r) => r.key);
const MAX_PER_DAY = 20;
const MAX_NOTIFIED = 5000;

const SEVERITY_ORDER: Record<string, number> = { EMERGENCIA: 0, ALERTA: 1, ATENCAO: 2, INFO: 3 };
const SEVERITY_ICON: Record<string, string> = { INFO: "ℹ️", ATENCAO: "⚠️", ALERTA: "🚨", EMERGENCIA: "🆘" };
const DEFAULT_HOURS: Record<string, number> = { INFO: 7 * 24, ATENCAO: 3 * 24, ALERTA: 3 * 24, EMERGENCIA: 48 };

// A quem interessa cada tipo de alerta (null = toda a gente)
const KIND_ROLES: Record<string, string[] | null> = {
  AGRICOLA: ["AGRICULTOR"],
  MARITIMO: ["PESCADOR"],
  CHUVA: ["AGRICULTOR", "PESCADOR"],
  SECA: ["AGRICULTOR", "PESCADOR"],
  TEMPESTADE: null,
  INUNDACAO: null,
  EMERGENCIA: null,
  OUTRO: ["AGRICULTOR", "PESCADOR", "ARTESAO"],
};

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function regionNames(keys: string[]): string {
  if (!keys || keys.length === 0) return "Todo o país";
  return keys.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k).join(", ");
}

function stateOf(alert: any): string {
  if (!alert.isActive) return "TERMINADO";
  if (alert.expiresAt && new Date(alert.expiresAt).getTime() < Date.now()) return "EXPIRADO";
  if (new Date(alert.startsAt).getTime() > Date.now()) return "AGENDADO";
  return "ATIVO";
}

function readAlert(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.kind !== undefined) {
    const kind = String(input?.kind ?? "");
    if (!KIND_VALUES.includes(kind)) {
      throw new Error("Escolha o tipo de alerta.");
    }
    if (existing && kind !== existing.kind) {
      throw new Error("O tipo de um alerta não se muda. Termine este e crie outro.");
    }
    data.kind = kind;
  }

  if (!existing || input?.severity !== undefined) {
    const severity = String(input?.severity ?? "ATENCAO");
    if (!SEVERITY_VALUES.includes(severity)) {
      throw new Error("Escolha a gravidade do alerta.");
    }
    data.severity = severity;
  }

  if (!existing || input?.title !== undefined) {
    const title = clean(input?.title, 120);
    if (!title || title.length < 3) {
      throw new Error("Escreva o título do alerta.");
    }
    data.title = title;
  }

  if (!existing || input?.message !== undefined) {
    const message = clean(input?.message, 1000);
    if (!message || message.length < 10) {
      throw new Error("Explique o que se passa (pelo menos 10 letras).");
    }
    data.message = message;
  }

  if (input?.advice !== undefined) data.advice = clean(input.advice, 600);

  if (Array.isArray(input?.regions)) {
    const wanted = Array.from(new Set(input.regions.map((r: any) => String(r))));
    const valid = wanted.filter((r) => REGION_KEYS.includes(r as string)) as string[];
    if (valid.length !== wanted.length) {
      throw new Error("Região inválida.");
    }
    data.regions = valid;
  }

  if (input?.expiresAt !== undefined) {
    if (input.expiresAt === null || input.expiresAt === "") {
      data.expiresAt = null;
    } else {
      const d = new Date(input.expiresAt);
      if (isNaN(d.getTime())) {
        throw new Error("Data de fim inválida.");
      }
      if (d.getTime() <= Date.now()) {
        throw new Error("A data de fim do alerta deve ser no futuro.");
      }
      data.expiresAt = d;
    }
  } else if (!existing) {
    const severity: string = data.severity;
    data.expiresAt = new Date(Date.now() + (data.kind === "SECA" ? 30 * 24 : DEFAULT_HOURS[severity] ?? 72) * 3600000);
  }

  return data;
}

async function shape(viewerId: string, role: string | undefined, items: any[]) {
  const orgs = await orgInfo(items.map((a) => a.ownerId));
  return items.map((a) => {
    const roles = KIND_ROLES[a.kind];
    return {
      ...a,
      state: stateOf(a),
      regionNames: regionNames(a.regions),
      nationwide: !a.regions || a.regions.length === 0,
      relevant: !roles || a.audience === "TODOS" || (!!role && roles.includes(role)),
      hoursLeft: a.expiresAt ? Math.max(0, Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / 3600000)) : null,
      organization: orgs.get(a.ownerId) ?? null,
      isMine: a.ownerId === viewerId,
    };
  });
}

async function broadcast(alert: any, mode: "NEW" | "UPDATE" | "END"): Promise<number> {
  const roles = alert.audience === "TODOS" ? undefined : KIND_ROLES[alert.kind] ?? undefined;
  const ids = await usersInRegions(alert.regions ?? [], { roles, excludeId: alert.ownerId, limit: MAX_NOTIFIED });
  if (ids.length === 0) return 0;

  const icon = SEVERITY_ICON[alert.severity] ?? "⚠️";
  const label = ALERT_SEVERITY.find((s) => s.value === alert.severity)?.label ?? "Alerta";
  const where = regionNames(alert.regions);

  const title =
    mode === "NEW" ? `${icon} ${label}: ${alert.title}` : mode === "UPDATE" ? `${icon} Atualização: ${alert.title}` : `✅ Fim do alerta: ${alert.title}`;
  const message = mode === "END" ? `O alerta terminou. ${where}.` : `${where}. ${alert.message}`;

  return notifyMany(ids, { title, message, relatedId: alert.id });
}

async function ownAlert(userId: string, role: string | undefined, id: string) {
  assertGov(role);
  const found = await prisma.officialAlert.findUnique({ where: { id } });
  if (!found || (found.ownerId !== userId && role !== "ADMIN")) {
    throw new Error("Alerta não encontrado.");
  }
  if (found.ownerId !== userId) {
    throw new Error("Só a instituição dona do alerta o pode mudar.");
  }
  return found;
}

// ---------- Regiões ----------
export function listRegionsInfo() {
  return REGIONS.map((r) => ({ key: r.key, name: r.name, lat: r.lat, lng: r.lng }));
}

// ---------- Criar e gerir (instituições públicas) ----------
export async function createAlert(userId: string, role: string | undefined, input: any) {
  assertGov(role);

  const today = await prisma.officialAlert.count({
    where: { ownerId: userId, createdAt: { gte: new Date(Date.now() - 86400000) } },
  });
  if (today >= MAX_PER_DAY) {
    throw new Error("Já criou muitos alertas nas últimas 24 horas. Atualize ou termine os que estão ativos.");
  }

  const data = readAlert(input);
  const audience = data.severity === "EMERGENCIA" || input?.audience === "TODOS" ? "TODOS" : "AUTO";

  const created = await prisma.officialAlert.create({
    data: { ownerId: userId, startsAt: new Date(), audience, ...data },
  });

  const notify = input?.notify !== undefined ? Boolean(input.notify) : data.severity !== "INFO";
  let notified = 0;
  if (notify) {
    notified = await broadcast(created, "NEW");
    await prisma.officialAlert.update({ where: { id: created.id }, data: { notifiedCount: notified } });
  }

  const fresh = await prisma.officialAlert.findUnique({ where: { id: created.id } });
  const [alert] = await shape(userId, role, [fresh]);
  return { alert, notified };
}

export async function updateAlert(userId: string, role: string | undefined, id: string, input: any) {
  const found = await ownAlert(userId, role, id);
  if (!found.isActive) {
    throw new Error("Este alerta já terminou. Crie um novo alerta.");
  }

  const data = readAlert(input, found);
  if (Object.keys(data).length === 0 && input?.renotify !== true) {
    throw new Error("Nada para atualizar.");
  }

  const updated = Object.keys(data).length ? await prisma.officialAlert.update({ where: { id }, data }) : found;

  let notified = 0;
  if (input?.renotify === true) {
    notified = await broadcast(updated, "UPDATE");
    await prisma.officialAlert.update({ where: { id }, data: { notifiedCount: found.notifiedCount + notified } });
  }

  const fresh = await prisma.officialAlert.findUnique({ where: { id } });
  const [alert] = await shape(userId, role, [fresh]);
  return { alert, notified };
}

export async function endAlert(userId: string, role: string | undefined, id: string, notifyEnd: boolean) {
  const found = await ownAlert(userId, role, id);
  if (!found.isActive) {
    throw new Error("Este alerta já terminou.");
  }

  const updated = await prisma.officialAlert.update({ where: { id }, data: { isActive: false } });

  let notified = 0;
  if (notifyEnd) {
    notified = await broadcast(updated, "END");
  }

  const [alert] = await shape(userId, role, [updated]);
  return { alert, notified };
}

export async function deleteAlert(userId: string, role: string | undefined, id: string) {
  await ownAlert(userId, role, id);
  await prisma.officialAlert.delete({ where: { id } });
  return { id, deleted: true };
}

export async function myAlerts(userId: string, role: string | undefined) {
  assertGov(role);
  const items = await prisma.officialAlert.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const shaped = await shape(userId, role, items);

  return {
    active: shaped.filter((a) => a.state === "ATIVO").length,
    total: shaped.length,
    items: shaped,
  };
}

// ---------- Ver alertas (qualquer pessoa) ----------
export async function listAlerts(
  userId: string,
  role: string | undefined,
  filters: { region?: string; kind?: string; severity?: string; all?: boolean }
) {
  const now = new Date();
  const where: any = {
    isActive: true,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.severity && SEVERITY_VALUES.includes(filters.severity)) where.severity = filters.severity;

  const rows = await prisma.officialAlert.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });

  let regionKey: string | null = null;
  let regionName: string | null = null;
  if (!filters.all) {
    let text = filters.region ?? null;
    if (!text) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { location: true } });
      text = user?.location ?? null;
    }
    const region = findRegion(text);
    regionKey = region?.key ?? null;
    regionName = region?.name ?? null;
  }

  const visible = filters.all
    ? rows
    : rows.filter((a) => a.regions.length === 0 || (!!regionKey && a.regions.includes(regionKey)));

  const shaped = (await shape(userId, role, visible)).sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { region: regionName, total: shaped.length, items: shaped };
}

export async function getAlert(userId: string, role: string | undefined, id: string) {
  const found = await prisma.officialAlert.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Alerta não encontrado.");
  }

  const [alert] = await shape(userId, role, [found]);
  return alert;
}
