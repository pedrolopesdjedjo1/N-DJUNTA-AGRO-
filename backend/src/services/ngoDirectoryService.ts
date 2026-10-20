import { prisma } from "../lib/prisma";
import { AREAS, values } from "../lib/ngoCatalog";

const AREA_VALUES = values(AREAS);

// Lista pública das organizações (ONG) ou das instituições do governo.
// Sem indicar o tipo, mostra só as ONG, como antes.
export async function listOrganizations(filters: {
  q?: string;
  region?: string;
  area?: string;
  verifiedOnly?: boolean;
  kind?: string;
}) {
  const where: any = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { acronym: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.area && AREA_VALUES.includes(filters.area)) where.areas = { has: filters.area };

  const kind = filters.kind === "GOVERNO" ? "GOVERNO" : filters.kind === "ALL" ? "ALL" : "ONG";

  const orgs = await prisma.organization.findMany({ where, orderBy: { name: "asc" }, take: 200 });
  if (orgs.length === 0) return [];

  const ownerIds = orgs.map((o) => o.ownerId);
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ownerIds }, isActive: true },
      select: { id: true, isVerified: true, role: true },
    }),
    prisma.ngoProject.groupBy({
      by: ["ownerId"],
      where: { ownerId: { in: ownerIds }, isPublic: true },
      _count: { _all: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const projectMap = new Map(projects.map((p) => [p.ownerId, p._count._all]));

  return orgs
    .filter((o) => {
      const user = userMap.get(o.ownerId);
      if (!user) return false;
      return kind === "ALL" || String(user.role) === kind;
    })
    .map((o) => ({
      ownerId: o.ownerId,
      name: o.name,
      acronym: o.acronym,
      description: o.description,
      areas: o.areas,
      region: o.region,
      logoUrl: o.logoUrl,
      institutionType: o.institutionType,
      parentInstitution: o.parentInstitution,
      role: String(userMap.get(o.ownerId)?.role),
      isVerified: !!userMap.get(o.ownerId)?.isVerified,
      projectsCount: projectMap.get(o.ownerId) ?? 0,
    }))
    .filter((o) => !filters.verifiedOnly || o.isVerified)
    .slice(0, 100);
}
