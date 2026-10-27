import { prisma } from "../lib/prisma";
import { AdminSnapshot } from "./adminAccess";

const PAGE_SIZE = 40;

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

// Regista o que um administrador fez
export async function logAudit(
  adminId: string,
  action: string,
  target: { type?: string; id?: string } | null,
  summary: string,
  meta?: any
) {
  try {
    await prisma.adminAudit.create({
      data: {
        adminId,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        summary: summary.slice(0, 300),
        meta: meta === undefined ? undefined : (meta as any),
      },
    });
  } catch (error) {
    console.error("logAudit", error);
  }
}

export async function logSecurity(
  adminId: string | null,
  kind: string,
  severity: "INFO" | "ALERTA",
  message: string,
  info: { ip?: string | null; userAgent?: string | null } = {}
) {
  try {
    await prisma.adminSecurityEvent.create({
      data: { adminId, kind, severity, message: message.slice(0, 300), ip: info.ip ?? null, userAgent: info.userAgent ?? null },
    });
  } catch (error) {
    console.error("logSecurity", error);
  }
}

async function namesOf(ids: (string | null)[]) {
  const list = Array.from(new Set(ids.filter(Boolean))) as string[];
  const users = list.length ? await prisma.user.findMany({ where: { id: { in: list } }, select: { id: true, name: true } }) : [];
  return new Map(users.map((u) => [u.id, u.name]));
}

// Quem tem permissão vê a atividade de todos; os outros só a sua
function scoped(viewer: AdminSnapshot, adminId?: string): string | undefined {
  const all = viewer.permissions.has("security.view") || viewer.permissions.has("team.manage");
  return all ? adminId : viewer.userId;
}

export async function listAudit(
  viewer: AdminSnapshot,
  filters: { adminId?: string; action?: string; targetType?: string; targetId?: string; from?: string; to?: string; q?: string; page?: number }
) {
  const where: any = {};
  const adminId = scoped(viewer, filters.adminId);
  if (adminId) where.adminId = adminId;
  if (filters.action) where.action = filters.action;
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.targetId) where.targetId = filters.targetId;

  const from = parseDay(filters.from);
  const to = parseDay(filters.to, true);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  if (filters.q) where.summary = { contains: filters.q, mode: "insensitive" };

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.adminAudit.count({ where }),
    prisma.adminAudit.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  const names = await namesOf(rows.map((r) => r.adminId));
  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    canSeeAll: viewer.permissions.has("security.view") || viewer.permissions.has("team.manage"),
    items: rows.map((r) => ({ ...r, adminName: names.get(r.adminId) ?? "Administrador" })),
  };
}

export async function listSecurityEvents(
  viewer: AdminSnapshot,
  filters: { adminId?: string; severity?: string; kind?: string; page?: number }
) {
  const where: any = {};
  const adminId = scoped(viewer, filters.adminId);
  if (adminId) where.adminId = adminId;
  if (filters.severity === "ALERTA") where.severity = "ALERTA";
  if (filters.kind) where.kind = filters.kind;

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, alerts, rows] = await Promise.all([
    prisma.adminSecurityEvent.count({ where }),
    prisma.adminSecurityEvent.count({ where: { ...where, severity: "ALERTA", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.adminSecurityEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  const names = await namesOf(rows.map((r) => r.adminId));
  return {
    total,
    alertsLast7Days: alerts,
    page,
    pageSize: PAGE_SIZE,
    items: rows.map((r) => ({ ...r, adminName: r.adminId ? names.get(r.adminId) ?? "Administrador" : null })),
  };
}
