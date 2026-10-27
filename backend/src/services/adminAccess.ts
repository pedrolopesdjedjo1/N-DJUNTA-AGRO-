import { prisma } from "../lib/prisma";
import { permissionsFor } from "../lib/adminCatalog";

const CACHE_MS = 30000;

export interface AdminSnapshot {
  userId: string;
  name: string;
  level: string;
  permissions: Set<string>;
  profile: any | null;
  legacy: boolean;
  status: string;
  active: boolean;
}

const cache = new Map<string, { at: number; value: AdminSnapshot | null }>();

export function forgetAdminCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

// Os administradores que já existiam antes desta área (sem perfil) contam como Super administradores
export async function loadAdmin(userId: string): Promise<AdminSnapshot | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true } });

  let snap: AdminSnapshot | null = null;
  if (user && String(user.role) === "ADMIN") {
    const profile = await prisma.adminProfile.findUnique({ where: { userId } });
    const level = profile?.level ?? "SUPER_ADMIN";
    snap = {
      userId,
      name: user.name,
      level,
      permissions: permissionsFor(level, profile?.extraPermissions ?? [], profile?.deniedPermissions ?? []),
      profile,
      legacy: !profile,
      status: profile?.status ?? "ATIVO",
      active: user.isActive,
    };
  }

  cache.set(userId, { at: Date.now(), value: snap });
  return snap;
}

export async function ensureAdminProfile(userId: string) {
  const found = await prisma.adminProfile.findUnique({ where: { userId } });
  if (found) return found;

  const created = await prisma.adminProfile.create({ data: { userId, level: "SUPER_ADMIN", createdBy: userId } });
  forgetAdminCache(userId);
  return created;
}

// Administradores ativos com controlo total (os sem perfil contam)
export async function activeSuperIds(): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (users.length === 0) return [];

  const profiles = await prisma.adminProfile.findMany({ where: { userId: { in: users.map((u) => u.id) } } });
  const map = new Map(profiles.map((p) => [p.userId, p]));

  return users
    .filter((u) => {
      const p = map.get(u.id);
      return !p || (p.level === "SUPER_ADMIN" && p.status === "ATIVO");
    })
    .map((u) => u.id);
}

export async function notifyAdminsWith(userIds: string[], title: string, message: string, relatedId?: string) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type: "SISTEMA" as const, title, message: message.slice(0, 300), relatedId: relatedId ?? null })),
  });
}
