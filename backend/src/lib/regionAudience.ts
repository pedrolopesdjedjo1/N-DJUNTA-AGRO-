import { prisma } from "./prisma";
import { findRegion } from "./ngoRegions";

// Pessoas ativas de uma ou mais regiões (pela localização que escreveram no perfil).
// Sem regiões, devolve o país todo.
export async function usersInRegions(
  regionKeys: string[],
  opts: { roles?: string[]; excludeId?: string; limit?: number } = {}
): Promise<string[]> {
  const where: any = { isActive: true };
  if (opts.roles && opts.roles.length > 0) where.role = { in: opts.roles as any };
  if (opts.excludeId) where.NOT = { id: opts.excludeId };
  if (regionKeys.length > 0) where.location = { not: null };

  const users = await prisma.user.findMany({ where, select: { id: true, location: true }, take: 30000 });
  const keys = new Set(regionKeys);

  const ids = users
    .filter((u) => keys.size === 0 || (!!u.location && keys.has(findRegion(u.location)?.key ?? "")))
    .map((u) => u.id);

  return ids.slice(0, opts.limit ?? 5000);
}

// Cria uma notificação para cada pessoa, em blocos
export async function notifyMany(
  userIds: string[],
  data: { title: string; message: string; relatedId: string }
): Promise<number> {
  const title = data.title.slice(0, 160);
  const message = data.message.slice(0, 300);

  for (let i = 0; i < userIds.length; i += 1000) {
    await prisma.notification.createMany({
      data: userIds.slice(i, i + 1000).map((userId) => ({
        userId,
        type: "SISTEMA" as const,
        title,
        message,
        relatedId: data.relatedId,
      })),
    });
  }
  return userIds.length;
}
