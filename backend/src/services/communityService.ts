import { CommunityPostKind, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const COLLECTIVE_KINDS = ["VENDA_COLETIVA", "COMPRA_COLETIVA"];

function clean(value: any, max = 2000): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

async function myCooperativeIds(userId: string) {
  const [member, led] = await Promise.all([
    prisma.cooperativeMember.findMany({ where: { userId }, select: { cooperativeId: true } }),
    prisma.cooperative.findMany({ where: { leaderId: userId }, select: { id: true } }),
  ]);
  return Array.from(new Set([...member.map((m) => m.cooperativeId), ...led.map((l) => l.id)]));
}

export async function listMyCooperatives(userId: string) {
  const ids = await myCooperativeIds(userId);
  if (ids.length === 0) return [];
  return prisma.cooperative.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, region: true },
    orderBy: { name: "asc" },
  });
}

export interface PostFilters {
  kind?: string;
  cooperativeId?: string;
  q?: string;
  mine?: boolean;
}

export async function listPosts(userId: string, filters: PostFilters) {
  const ids = await myCooperativeIds(userId);
  const and: Prisma.CommunityPostWhereInput[] = [
    { OR: [{ cooperativeId: null }, { cooperativeId: { in: ids } }] },
  ];

  const where: Prisma.CommunityPostWhereInput = {};

  if (filters.cooperativeId) {
    if (!ids.includes(filters.cooperativeId)) {
      throw new Error("Só os membros veem as publicações desta cooperativa.");
    }
    where.cooperativeId = filters.cooperativeId;
  }
  if (filters.kind && (Object.values(CommunityPostKind) as string[]).includes(filters.kind)) {
    where.kind = filters.kind as CommunityPostKind;
  }
  if (filters.mine) where.authorId = userId;
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { content: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  where.AND = and;

  const posts = await prisma.communityPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { cooperative: { select: { id: true, name: true } } },
  });
  const users = await usersByIds(posts.map((p) => p.authorId));

  return posts.map((p) => ({
    ...p,
    authorName: users.get(p.authorId)?.name ?? "Utilizador",
    isMine: p.authorId === userId,
  }));
}

export async function createPost(userId: string, input: any) {
  const title = clean(input?.title, 150);
  const content = clean(input?.content);
  if (!title || !content) {
    throw new Error("Preencha o título e o texto.");
  }

  const kind = String(input.kind ?? "CONHECIMENTO");
  if (!(Object.values(CommunityPostKind) as string[]).includes(kind)) {
    throw new Error("Tipo de publicação inválido.");
  }

  const cooperativeId = input.cooperativeId ? String(input.cooperativeId) : null;
  if (kind !== "CONHECIMENTO" && !cooperativeId) {
    throw new Error("Escolha a cooperativa para este tipo de publicação.");
  }

  if (cooperativeId) {
    const ids = await myCooperativeIds(userId);
    if (!ids.includes(cooperativeId)) {
      throw new Error("Só os membros podem publicar nesta cooperativa.");
    }
  }

  const imageUrl =
    typeof input.imageUrl === "string" &&
    input.imageUrl.startsWith("https://") &&
    input.imageUrl.includes(".supabase.co/storage/v1/object/public/")
      ? input.imageUrl
      : null;

  const post = await prisma.communityPost.create({
    data: { authorId: userId, cooperativeId, kind: kind as CommunityPostKind, title, content, imageUrl },
  });

  if (cooperativeId && COLLECTIVE_KINDS.includes(kind)) {
    const [members, coop] = await Promise.all([
      prisma.cooperativeMember.findMany({ where: { cooperativeId }, select: { userId: true } }),
      prisma.cooperative.findUnique({ where: { id: cooperativeId }, select: { leaderId: true, name: true } }),
    ]);
    const targets = new Set(members.map((m) => m.userId));
    if (coop) targets.add(coop.leaderId);
    targets.delete(userId);

    if (targets.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(targets).map((id) => ({
          userId: id,
          type: "SISTEMA" as const,
          title: kind === "VENDA_COLETIVA" ? "Nova venda coletiva" : "Nova compra coletiva",
          message: `${title} (${coop?.name ?? "cooperativa"})`,
          relatedId: post.id,
        })),
      });
    }
  }

  return post;
}

export async function deletePost(userId: string, role: string | undefined, id: string) {
  const post = await prisma.communityPost.findUnique({ where: { id } });
  if (!post) {
    throw new Error("Publicação não encontrada.");
  }

  let allowed = post.authorId === userId || role === "ADMIN";
  if (!allowed && post.cooperativeId) {
    const coop = await prisma.cooperative.findUnique({
      where: { id: post.cooperativeId },
      select: { leaderId: true },
    });
    allowed = coop?.leaderId === userId;
  }
  if (!allowed) {
    throw new Error("Você não tem permissão para apagar esta publicação.");
  }

  await prisma.communityPost.delete({ where: { id } });
  return { id, deleted: true };
}
