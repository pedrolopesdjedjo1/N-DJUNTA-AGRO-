import { prisma } from "./prisma";

export interface UserLite {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  isVerified: boolean;
}

export async function usersByIds(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, UserLite>();
  if (unique.length === 0) return map;

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, phone: true, location: true, isVerified: true },
  });
  users.forEach((u) => map.set(u.id, u));
  return map;
}
