import { prisma } from "../lib/prisma";
import { PUBLICATION_KINDS, values } from "../lib/ngoCatalog";
import { orgInfo } from "../lib/ngoOrgInfo";
import { assertNgo } from "./organizationService";

const KIND_VALUES = values(PUBLICATION_KINDS);
const MAX_IMAGES = 10;
const PAGE_SIZE = 20;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function validStorageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

async function readPublication(userId: string, input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.kind !== undefined) {
    const kind = String(input?.kind ?? "");
    if (!KIND_VALUES.includes(kind)) {
      throw new Error("Escolha o tipo de publicação.");
    }
    data.kind = kind;
  }

  if (!existing || input?.title !== undefined) {
    const title = clean(input?.title, 150);
    if (!title || title.length < 3) {
      throw new Error("Escreva o título da publicação.");
    }
    data.title = title;
  }

  if (input?.body !== undefined) data.body = clean(input.body, 5000);

  if (input?.imageUrls !== undefined) {
    if (!Array.isArray(input.imageUrls)) {
      throw new Error("Lista de fotos inválida.");
    }
    if (!input.imageUrls.every(validStorageUrl)) {
      throw new Error("Foto inválida. Envie as fotos pelo app.");
    }
    data.imageUrls = input.imageUrls.slice(0, MAX_IMAGES);
  }

  if (input?.videoUrl !== undefined) {
    const video = clean(input.videoUrl, 300);
    if (video && !validStorageUrl(video) && !/^https:\/\/\S+$/i.test(video)) {
      throw new Error("Endereço do vídeo inválido.");
    }
    data.videoUrl = video;
  }

  if (input?.projectId !== undefined) {
    if (input.projectId) {
      const project = await prisma.ngoProject.findUnique({ where: { id: String(input.projectId) } });
      if (!project || project.ownerId !== userId) {
        throw new Error("Projeto não encontrado.");
      }
      data.projectId = project.id;
    } else {
      data.projectId = null;
    }
  }

  if (input?.region !== undefined) data.region = clean(input.region, 80);
  if (input?.communityName !== undefined) data.communityName = clean(input.communityName, 80);
  if (input?.isPublished !== undefined) data.isPublished = Boolean(input.isPublished);

  // Cada tipo precisa do seu conteúdo
  const kind: string = data.kind ?? existing?.kind;
  const body: string | null = data.body !== undefined ? data.body : existing?.body ?? null;
  const images: string[] = data.imageUrls !== undefined ? data.imageUrls : existing?.imageUrls ?? [];
  const video: string | null = data.videoUrl !== undefined ? data.videoUrl : existing?.videoUrl ?? null;

  if (kind === "FOTO" && images.length === 0) {
    throw new Error("Junte pelo menos uma fotografia.");
  }
  if (kind === "VIDEO" && !video) {
    throw new Error("Junte o vídeo.");
  }
  if (kind !== "FOTO" && kind !== "VIDEO" && (!body || body.length < 10)) {
    throw new Error("Escreva o texto da publicação (pelo menos 10 letras).");
  }

  return data;
}

async function shape(items: any[], viewerId: string) {
  const projectIds = Array.from(new Set(items.map((p) => p.projectId).filter(Boolean))) as string[];
  const [orgs, projects] = await Promise.all([
    orgInfo(items.map((p) => p.ownerId)),
    projectIds.length
      ? prisma.ngoProject.findMany({ where: { id: { in: projectIds }, isPublic: true }, select: { id: true, name: true } })
      : Promise.resolve([] as any[]),
  ]);
  const projectNames = new Map((projects as any[]).map((p) => [p.id, p.name]));

  return items.map((p) => ({
    ...p,
    organization: orgs.get(p.ownerId) ?? null,
    projectName: p.projectId ? projectNames.get(p.projectId) ?? null : null,
    isMine: p.ownerId === viewerId,
  }));
}

// Avisa quem segue a organização e os beneficiários do projeto ligado
async function notifyAudience(publication: any) {
  const [followers, linked, org] = await Promise.all([
    prisma.favoriteSeller.findMany({
      where: { sellerId: publication.ownerId, notify: true },
      select: { userId: true },
      take: 500,
    }),
    publication.projectId
      ? prisma.ngoBeneficiary.findMany({
          where: { projectId: publication.projectId, userId: { not: null } },
          select: { userId: true },
          take: 500,
        })
      : Promise.resolve([] as { userId: string | null }[]),
    orgInfo([publication.ownerId]),
  ]);

  const targets = new Set<string>();
  followers.forEach((f) => targets.add(f.userId));
  linked.forEach((b) => b.userId && targets.add(b.userId));
  targets.delete(publication.ownerId);
  if (targets.size === 0) return;

  const name = orgs(org, publication.ownerId);
  await prisma.notification.createMany({
    data: Array.from(targets).map((target) => ({
      userId: target,
      type: "SISTEMA" as const,
      title: `Novidade de ${name}`,
      message: publication.title,
      relatedId: publication.id,
    })),
  });
}

function orgs(map: Map<string, { name: string }>, id: string) {
  return map.get(id)?.name ?? "uma organização";
}

// ---------- Ver publicações (qualquer pessoa) ----------
export async function listPublications(
  userId: string,
  filters: { kind?: string; region?: string; ownerId?: string; projectId?: string; q?: string; page?: number }
) {
  const where: any = { isPublished: true };
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { body: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, items] = await Promise.all([
    prisma.publication.count({ where }),
    prisma.publication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return { total, page, pageSize: PAGE_SIZE, items: await shape(items, userId) };
}

export async function getPublication(userId: string, id: string) {
  const found = await prisma.publication.findUnique({ where: { id } });
  if (!found || (!found.isPublished && found.ownerId !== userId)) {
    throw new Error("Publicação não encontrada.");
  }
  const [item] = await shape([found], userId);
  return item;
}

// ---------- Publicar e gerir (ONG) ----------
export async function myPublications(userId: string, role: string | undefined, filters: { kind?: string; draft?: boolean }) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.draft) where.isPublished = false;

  const items = await prisma.publication.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return shape(items, userId);
}

export async function createPublication(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const data = await readPublication(userId, input);
  const created = await prisma.publication.create({
    data: { ownerId: userId, ...data, isPublished: data.isPublished ?? true },
  });

  if (created.isPublished) {
    await notifyAudience(created);
  }

  const [item] = await shape([created], userId);
  return item;
}

export async function updatePublication(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);

  const found = await prisma.publication.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Publicação não encontrada.");
  }

  const data = await readPublication(userId, input, found);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.publication.update({ where: { id }, data });

  if (!found.isPublished && updated.isPublished) {
    await notifyAudience(updated);
  }

  const [item] = await shape([updated], userId);
  return item;
}

export async function deletePublication(userId: string, role: string | undefined, id: string) {
  assertNgo(role);

  const found = await prisma.publication.findUnique({ where: { id } });
  if (!found || (found.ownerId !== userId && role !== "ADMIN")) {
    throw new Error("Publicação não encontrada.");
  }

  await prisma.publication.delete({ where: { id } });
  return { id, deleted: true };
}
