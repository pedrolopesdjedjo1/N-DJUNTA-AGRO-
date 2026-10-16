import { prisma } from "../lib/prisma";
import { AREAS, FOCUS, PROJECT_STATUS, RESULT_INDICATORS, values } from "../lib/ngoCatalog";
import { assertNgo } from "./organizationService";

const DAY = 86400000;
const AREA_VALUES = values(AREAS);
const STATUS_VALUES = values(PROJECT_STATUS);
const INDICATOR_VALUES = values(RESULT_INDICATORS);
const MAX_PROJECTS = 200;
const MAX_MEDIA = 40;

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

function readDate(value: any, label: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`${label} inválida.`);
  }
  return d;
}

function readNumber(value: any, label: string, min: number, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  if (isNaN(n) || n < min || n > max) {
    throw new Error(`${label} inválido.`);
  }
  return n;
}

function readProject(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.name !== undefined) {
    const name = clean(input?.name, 150);
    if (!name || name.length < 3) {
      throw new Error("Escreva o nome do projeto.");
    }
    data.name = name;
  }

  if (input?.description !== undefined) data.description = clean(input.description, 3000);
  if (input?.objectives !== undefined) data.objectives = clean(input.objectives, 2000);

  if (!existing || input?.area !== undefined) {
    if (!AREA_VALUES.includes(String(input?.area))) {
      throw new Error("Escolha a área de atuação.");
    }
    data.area = String(input.area);
  }

  const area: string = data.area ?? existing?.area;
  if (input?.focus !== undefined || data.area) {
    const focus = input?.focus ? String(input.focus) : null;
    if (focus && !(FOCUS[area] ?? []).some((f) => f.value === focus)) {
      throw new Error("Esse foco não existe para a área escolhida.");
    }
    data.focus = focus;
  }

  if (input?.status !== undefined) {
    if (!STATUS_VALUES.includes(String(input.status))) {
      throw new Error("Estado do projeto inválido.");
    }
    data.status = String(input.status);
  }

  if (input?.region !== undefined) data.region = clean(input.region, 80);

  if (Array.isArray(input?.communities)) {
    data.communities = input.communities
      .map((c: any) => String(c).trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);
  }

  const start = readDate(input?.startDate, "Data de início");
  const end = readDate(input?.endDate, "Data de término");
  if (start !== undefined) data.startDate = start;
  if (end !== undefined) data.endDate = end;

  const finalStart: Date | null = start !== undefined ? start : existing?.startDate ?? null;
  const finalEnd: Date | null = end !== undefined ? end : existing?.endDate ?? null;
  if (finalStart && finalEnd && finalEnd.getTime() < finalStart.getTime()) {
    throw new Error("A data de término deve ser depois da data de início.");
  }

  const budget = readNumber(input?.budget, "Orçamento", 0, 1e12);
  if (budget !== undefined) data.budget = budget;

  const target = readNumber(input?.targetBeneficiaries, "Meta de beneficiários", 0, 10000000);
  if (target !== undefined) data.targetBeneficiaries = target === null ? null : Math.floor(target);

  if (input?.lat !== undefined || input?.lng !== undefined) {
    const lat = readNumber(input?.lat, "Latitude", -90, 90);
    const lng = readNumber(input?.lng, "Longitude", -180, 180);
    if ((lat === null) !== (lng === null) || (lat === undefined) !== (lng === undefined)) {
      throw new Error("Informe a latitude e a longitude juntas.");
    }
    data.lat = lat;
    data.lng = lng;
  }

  if (input?.coverUrl !== undefined) {
    if (input.coverUrl && !validStorageUrl(input.coverUrl)) {
      throw new Error("Foto de capa inválida.");
    }
    data.coverUrl = input.coverUrl || null;
  }

  if (input?.isPublic !== undefined) data.isPublic = Boolean(input.isPublic);

  return data;
}

function withDates(project: any) {
  let daysLeft: number | null = null;
  if (project.endDate) {
    daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / DAY);
  }
  return {
    ...project,
    daysLeft,
    overdue: daysLeft !== null && daysLeft < 0 && ["EM_ANDAMENTO", "PLANEAMENTO"].includes(project.status),
  };
}

// ---------- Lista ----------
export async function listProjects(
  userId: string,
  role: string | undefined,
  filters: { status?: string; area?: string; focus?: string; q?: string }
) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.area && AREA_VALUES.includes(filters.area)) where.area = filters.area;
  if (filters.focus) where.focus = filters.focus;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [projects, all] = await Promise.all([
    prisma.ngoProject.findMany({ where, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.ngoProject.groupBy({ by: ["status"], where: { ownerId: userId }, _count: { _all: true } }),
  ]);

  const ids = projects.map((p) => p.id);
  const [bens, ups] =
    ids.length > 0
      ? await Promise.all([
          prisma.ngoBeneficiary.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _count: { _all: true } }),
          prisma.ngoProjectUpdate.groupBy({
            by: ["projectId"],
            where: { projectId: { in: ids } },
            _count: { _all: true },
            _max: { progress: true },
          }),
        ])
      : [[], []];

  const benMap = new Map<string, number>();
  (bens as any[]).forEach((b) => b.projectId && benMap.set(b.projectId, b._count._all));
  const upMap = new Map<string, { count: number; progress: number | null }>();
  (ups as any[]).forEach((u) => upMap.set(u.projectId, { count: u._count._all, progress: u._max.progress ?? null }));

  const counts: Record<string, number> = {};
  all.forEach((g) => (counts[g.status] = g._count._all));

  return {
    counts,
    total: all.reduce((s, g) => s + g._count._all, 0),
    projects: projects.map((p) =>
      withDates({
        ...p,
        beneficiaries: benMap.get(p.id) ?? 0,
        updatesCount: upMap.get(p.id)?.count ?? 0,
        progress: upMap.get(p.id)?.progress ?? null,
      })
    ),
  };
}

// ---------- Detalhe ----------
async function bundle(project: any, publicView: boolean) {
  const [media, updates, results, beneficiaries] = await Promise.all([
    prisma.ngoProjectMedia.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } }),
    prisma.ngoProjectUpdate.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.ngoResult.findMany({ where: { projectId: project.id }, orderBy: { recordedAt: "desc" } }),
    prisma.ngoBeneficiary.count({ where: { projectId: project.id } }),
  ]);

  const progress = updates.find((u) => u.progress !== null)?.progress ?? null;
  const base: any = { ...project, beneficiaries, progress };
  if (publicView) delete base.budget;

  const owner = publicView
    ? await prisma.organization.findUnique({
        where: { ownerId: project.ownerId },
        select: { name: true, logoUrl: true },
      })
    : null;

  return {
    project: withDates(base),
    media,
    updates,
    results: results.map((r) => ({
      ...r,
      indicatorLabel: r.label || RESULT_INDICATORS.find((i) => i.value === r.indicator)?.label || r.indicator,
    })),
    organization: owner,
  };
}

async function loadOwn(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const project = await prisma.ngoProject.findUnique({ where: { id } });
  if (!project || (project.ownerId !== userId && role !== "ADMIN")) {
    throw new Error("Projeto não encontrado.");
  }
  return project;
}

export async function getProject(userId: string, role: string | undefined, id: string) {
  const project = await loadOwn(userId, role, id);
  return bundle(project, false);
}

// ---------- Criar, editar, apagar ----------
export async function createProject(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const count = await prisma.ngoProject.count({ where: { ownerId: userId } });
  if (count >= MAX_PROJECTS) {
    throw new Error(`Pode ter até ${MAX_PROJECTS} projetos.`);
  }

  const data = readProject(input);
  const project = await prisma.ngoProject.create({ data: { ownerId: userId, ...data } });
  return getProject(userId, role, project.id);
}

export async function updateProject(userId: string, role: string | undefined, id: string, input: any) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode editá-lo.");
  }

  const data = readProject(input, project);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  await prisma.ngoProject.update({ where: { id }, data });
  return getProject(userId, role, id);
}

export async function deleteProject(userId: string, role: string | undefined, id: string) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode apagá-lo.");
  }

  await prisma.ngoProject.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Fotos e vídeos ----------
export async function addMedia(userId: string, role: string | undefined, id: string, input: any) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode juntar ficheiros.");
  }

  const kind = String(input?.kind ?? "IMAGE");
  if (kind !== "IMAGE" && kind !== "VIDEO") {
    throw new Error("Tipo de ficheiro inválido.");
  }
  if (!validStorageUrl(input?.url)) {
    throw new Error("Ficheiro inválido. Envie a foto ou o vídeo pelo app.");
  }

  const count = await prisma.ngoProjectMedia.count({ where: { projectId: id } });
  if (count >= MAX_MEDIA) {
    throw new Error(`Cada projeto aceita até ${MAX_MEDIA} fotos e vídeos.`);
  }

  await prisma.ngoProjectMedia.create({
    data: { projectId: id, kind, url: input.url, caption: clean(input?.caption, 200) },
  });
  return getProject(userId, role, id);
}

export async function deleteMedia(userId: string, role: string | undefined, id: string, mediaId: string) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode apagar ficheiros.");
  }

  const media = await prisma.ngoProjectMedia.findUnique({ where: { id: mediaId } });
  if (!media || media.projectId !== id) {
    throw new Error("Ficheiro não encontrado.");
  }

  await prisma.ngoProjectMedia.delete({ where: { id: mediaId } });
  return getProject(userId, role, id);
}

// ---------- Atualizações ----------
export async function addUpdate(userId: string, role: string | undefined, id: string, input: any) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode publicar atualizações.");
  }

  const title = clean(input?.title, 150);
  if (!title) {
    throw new Error("Escreva o título da atualização.");
  }

  let progress: number | null = null;
  if (input?.progress !== undefined && input.progress !== null && input.progress !== "") {
    progress = Math.floor(Number(input.progress));
    if (isNaN(progress) || progress < 0 || progress > 100) {
      throw new Error("O progresso deve ser de 0 a 100.");
    }
  }

  await prisma.ngoProjectUpdate.create({
    data: { projectId: id, authorId: userId, title, body: clean(input?.body, 2000), progress },
  });

  // Avisa os beneficiários que têm conta no app
  const linked = await prisma.ngoBeneficiary.findMany({
    where: { projectId: id, userId: { not: null } },
    select: { userId: true },
    take: 500,
  });
  const targets = Array.from(new Set(linked.map((b) => b.userId).filter(Boolean))) as string[];
  if (targets.length > 0) {
    await prisma.notification.createMany({
      data: targets.map((target) => ({
        userId: target,
        type: "SISTEMA" as const,
        title: `Novidade no projeto ${project.name}`,
        message: title,
        relatedId: id,
      })),
    });
  }

  return getProject(userId, role, id);
}

export async function deleteUpdate(userId: string, role: string | undefined, id: string, updateId: string) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode apagar atualizações.");
  }

  const found = await prisma.ngoProjectUpdate.findUnique({ where: { id: updateId } });
  if (!found || found.projectId !== id) {
    throw new Error("Atualização não encontrada.");
  }

  await prisma.ngoProjectUpdate.delete({ where: { id: updateId } });
  return getProject(userId, role, id);
}

// ---------- Resultados ----------
export async function addResult(userId: string, role: string | undefined, id: string, input: any) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode registar resultados.");
  }

  const indicator = String(input?.indicator ?? "");
  if (!INDICATOR_VALUES.includes(indicator)) {
    throw new Error("Escolha o tipo de resultado.");
  }

  const value = Number(String(input?.value ?? "").replace(",", "."));
  if (isNaN(value) || value < 0 || value > 1e12) {
    throw new Error("Valor inválido.");
  }

  const label = indicator === "OUTRO" ? clean(input?.label, 80) : null;
  if (indicator === "OUTRO" && !label) {
    throw new Error("Escreva o nome do resultado.");
  }

  const recordedAt = input?.recordedAt ? new Date(input.recordedAt) : new Date();
  if (isNaN(recordedAt.getTime())) {
    throw new Error("Data inválida.");
  }

  const defaultUnit = RESULT_INDICATORS.find((i) => i.value === indicator)?.unit ?? "";

  await prisma.ngoResult.create({
    data: {
      projectId: id,
      ownerId: userId,
      indicator,
      label,
      value,
      unit: clean(input?.unit, 30) ?? (defaultUnit || null),
      note: clean(input?.note, 300),
      recordedAt,
    },
  });
  return getProject(userId, role, id);
}

export async function deleteResult(userId: string, role: string | undefined, id: string, resultId: string) {
  const project = await loadOwn(userId, role, id);
  if (project.ownerId !== userId) {
    throw new Error("Só a organização dona do projeto pode apagar resultados.");
  }

  const found = await prisma.ngoResult.findUnique({ where: { id: resultId } });
  if (!found || found.projectId !== id) {
    throw new Error("Resultado não encontrado.");
  }

  await prisma.ngoResult.delete({ where: { id: resultId } });
  return getProject(userId, role, id);
}

// ---------- Projetos públicos (para qualquer pessoa) ----------
export async function listPublicProjects(filters: { area?: string; region?: string; q?: string; status?: string }) {
  const where: any = { isPublic: true };
  if (filters.area && AREA_VALUES.includes(filters.area)) where.area = filters.area;
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const projects = await prisma.ngoProject.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      id: true,
      ownerId: true,
      name: true,
      description: true,
      area: true,
      focus: true,
      status: true,
      region: true,
      startDate: true,
      endDate: true,
      coverUrl: true,
    },
  });

  const owners = await prisma.organization.findMany({
    where: { ownerId: { in: Array.from(new Set(projects.map((p) => p.ownerId))) } },
    select: { ownerId: true, name: true, logoUrl: true },
  });
  const byOwner = new Map(owners.map((o) => [o.ownerId, o]));

  return projects.map((p) => ({ ...p, organization: byOwner.get(p.ownerId) ?? null }));
}

export async function getPublicProject(viewerId: string, id: string) {
  const project = await prisma.ngoProject.findUnique({ where: { id } });
  if (!project || (!project.isPublic && project.ownerId !== viewerId)) {
    throw new Error("Projeto não encontrado.");
  }
  return bundle(project, project.ownerId !== viewerId);
}
