import { prisma } from "./prisma";

export interface OrgInfo {
  name: string;
  logoUrl: string | null;
  isVerified: boolean;
  role: string;
}

// Nome, logo e selo de verificação de quem publica (ONG, governo ou equipa do app)
export async function orgInfo(ownerIds: string[]): Promise<Map<string, OrgInfo>> {
  const ids = Array.from(new Set(ownerIds.filter(Boolean)));
  const map = new Map<string, OrgInfo>();
  if (ids.length === 0) return map;

  const [orgs, users] = await Promise.all([
    prisma.organization.findMany({ where: { ownerId: { in: ids } }, select: { ownerId: true, name: true, logoUrl: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, isVerified: true, role: true } }),
  ]);
  const orgMap = new Map(orgs.map((o) => [o.ownerId, o]));

  users.forEach((u) =>
    map.set(u.id, {
      name: orgMap.get(u.id)?.name ?? u.name,
      logoUrl: orgMap.get(u.id)?.logoUrl ?? null,
      isVerified: u.isVerified,
      role: String(u.role),
    })
  );
  return map;
}
