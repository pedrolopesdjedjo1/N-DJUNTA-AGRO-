import { prisma } from "../lib/prisma";
import { AREAS, PROJECT_STATUS, RESULT_INDICATORS, values } from "../lib/ngoCatalog";
import { orgInfo } from "../lib/ngoOrgInfo";
import { assertGov } from "./organizationService";

const DAY = 86400000;
const AREA_VALUES = values(AREAS);
const STATUS_VALUES = values(PROJECT_STATUS);
const MAX_PROGRAMS = 100;
const MAX_PROJECTS_PER_PROGRAM = 100;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function readProgram(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.name !== undefined) {
    const name = clean(input?.name, 150);
    if (!name || name.length < 3) {
      throw new Error("Escreva o nome do programa.");
    }
    data.name = name;
  }

  if (input?.description !== undefined) data.description = clean(input.description, 3000);
  if (input?.objectives !== undefined) data.objectives = clean(input.objectives, 2000);

  if (!existing || input?.area !== undefined) {
    if (!AREA_VALUES.includes(String(input?.area))) {
      throw new Error("Escolha a área do programa.");
    }
    data.area = String(input.area);
  }

  if (Array.isArray(input?.regions)) {
    data.regions = input.regions
      .map((r: any) => String(r).trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 12);
  }

  if (input?.status !== undefined) {
    if (!STATUS_VALUES.includes(String(input.status))) {
      throw new Error("Estado do programa inválido.");
    }
    data.status = String(input.status);
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

  const budget = readNumber(input?.budget, "Orçamento", 0, 1e13);
  if (budget !== undefined) data.budget = budget;

  const target = readNumber(input?.targetBeneficiaries, "Meta de beneficiários", 0, 100000000);
  if (target !== undefined) data.targetBeneficiaries = target === null ? null : Math.floor(target);

  if (input?.isPublic !== undefined) data.isPublic = Boolean(input.isPublic);

  return data;
}

function withDates(program: any) {
  const daysLeft = program.endDate ? Math.ceil((new Date(program.endDate).getTime() - Date.now()) / DAY) : null;
  return {
    ...program,
    daysLeft,
    overdue: daysLeft !== null && daysLeft < 0 && ["EM_ANDAMENTO", "PLANEAMENTO"].includes(program.status),
  };
}

interface Stats {
  projects: number;
  active: number;
  beneficiaries: number;
  projectIds: string[];
}

async function programStats(programIds: string[]) {
  const result = new Map<string, Stats>();
  programIds.forEach((id) => result.set(id, { projects: 0, active: 0, beneficiaries: 0, projectIds: [] }));
  if (programIds.length === 0) return result;

  const links = await prisma.govProgramProject.findMany({ where: { programId: { in: programIds } } });
  const projectIds = links.map((l) => l.projectId);
  if (projectIds.length === 0) return result;

  const [projects, bens] = await Promise.all([
    prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, status: true } }),
    prisma.ngoBeneficiary.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _count: { _all: true } }),
  ]);
  const statusMap = new Map(projects.map((p) => [p.id, p.status]));
  const benMap = new Map<string, number>();
  bens.forEach((b) => b.projectId && benMap.set(b.projectId, b._count._all));

  links.forEach((l) => {
    const s = result.get(l.programId);
    if (!s || !statusMap.has(l.projectId)) return;
    s.projects += 1;
    s.projectIds.push(l.projectId);
    if (["PLANEAMENTO", "EM_ANDAMENTO"].includes(statusMap.get(l.projectId) as string)) s.active += 1;
    s.beneficiaries += benMap.get(l.projectId) ?? 0;
  });

  return result;
}

async function resultsOf(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const rows = await prisma.ngoResult.findMany({ where: { projectId: { in: projectIds } } });

  const sums = new Map<string, { indicator: string; label: string; unit: string; value: number }>();
  rows.forEach((r) => {
    const def = RESULT_INDICATORS.find((i) => i.value === r.indicator);
    const key = r.indicator === "OUTRO" ? `OUTRO:${plain(r.label)}` : r.indicator;
    const row = sums.get(key) ?? {
      indicator: r.indicator,
      label: r.indicator === "OUTRO" ? r.label ?? "Outro resultado" : def?.label ?? r.indicator,
      unit: r.unit ?? def?.unit ?? "",
      value: 0,
    };
    row.value += r.value;
    sums.set(key, row);
  });

  return Array.from(sums.values()).sort((a, b) => b.value - a.value);
}

async function ownProgram(userId: string, role: string | undefined, id: string) {
  assertGov(role);
  const program = await prisma.govProgram.findUnique({ where: { id } });
  if (!program || (program.ownerId !== userId && role !== "ADMIN")) {
    throw new Error("Programa não encontrado.");
  }
  return program;
}

// ---------- Lista ----------
export async function listPrograms(
  userId: string,
  role: string | undefined,
  filters: { status?: string; area?: string; q?: string }
) {
  assertGov(role);

  const where: any = { ownerId: userId };
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.area && AREA_VALUES.includes(filters.area)) where.area = filters.area;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [programs, groups] = await Promise.all([
    prisma.govProgram.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.govProgram.groupBy({ by: ["status"], where: { ownerId: userId }, _count: { _all: true } }),
  ]);

  const stats = await programStats(programs.map((p) => p.id));
  const counts: Record<string, number> = {};
  groups.forEach((g) => (counts[g.status] = g._count._all));

  return {
    counts,
    total: groups.reduce((s, g) => s + g._count._all, 0),
    programs: programs.map((p) => {
      const s = stats.get(p.id);
      return withDates({ ...p, projectsCount: s?.projects ?? 0, activeProjects: s?.active ?? 0, beneficiaries: s?.beneficiaries ?? 0 });
    }),
  };
}

// ---------- Detalhe ----------
export async function getProgram(userId: string, role: string | undefined, id: string) {
  const program = await ownProgram(userId, role, id);

  const links = await prisma.govProgramProject.findMany({ where: { programId: id }, orderBy: { createdAt: "asc" } });
  const projectIds = links.map((l) => l.projectId);

  const [projects, bens, updates, results, mine, linkedElsewhere] = await Promise.all([
    projectIds.length
      ? prisma.ngoProject.findMany({
          where: { id: { in: projectIds } },
          select: {
            id: true,
            name: true,
            status: true,
            area: true,
            region: true,
            startDate: true,
            endDate: true,
            budget: true,
            targetBeneficiaries: true,
            isPublic: true,
          },
        })
      : Promise.resolve([] as any[]),
    projectIds.length
      ? prisma.ngoBeneficiary.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _count: { _all: true } })
      : Promise.resolve([] as any[]),
    projectIds.length
      ? prisma.ngoProjectUpdate.findMany({ where: { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" }, take: 40 })
      : Promise.resolve([] as any[]),
    resultsOf(projectIds),
    prisma.ngoProject.findMany({
      where: { ownerId: program.ownerId },
      select: { id: true, name: true, status: true, area: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.govProgramProject.findMany({ where: {}, select: { projectId: true }, take: 5000 }),
  ]);

  const benMap = new Map<string, number>();
  (bens as any[]).forEach((b) => b.projectId && benMap.set(b.projectId, b._count._all));

  const progressMap = new Map<string, number>();
  (updates as any[]).forEach((u) => {
    if (u.progress !== null && !progressMap.has(u.projectId)) progressMap.set(u.projectId, u.progress);
  });
  const projectNames = new Map((projects as any[]).map((p) => [p.id, p.name]));

  const linkedSet = new Set(linkedElsewhere.map((l) => l.projectId));
  const beneficiaries = (projects as any[]).reduce((s, p) => s + (benMap.get(p.id) ?? 0), 0);

  return {
    program: withDates({
      ...program,
      projectsCount: (projects as any[]).length,
      activeProjects: (projects as any[]).filter((p) => ["PLANEAMENTO", "EM_ANDAMENTO"].includes(p.status)).length,
      beneficiaries,
      projectsBudget: (projects as any[]).reduce((s, p) => s + (p.budget ?? 0), 0),
    }),
    projects: (projects as any[]).map((p) => ({
      ...p,
      beneficiaries: benMap.get(p.id) ?? 0,
      progress: progressMap.get(p.id) ?? null,
    })),
    results,
    updates: (updates as any[]).slice(0, 10).map((u) => ({
      id: u.id,
      projectId: u.projectId,
      projectName: projectNames.get(u.projectId) ?? "Projeto",
      title: u.title,
      progress: u.progress,
      createdAt: u.createdAt,
    })),
    availableProjects: mine.filter((p) => !linkedSet.has(p.id)),
  };
}

// ---------- Criar, editar, apagar ----------
export async function createProgram(userId: string, role: string | undefined, input: any) {
  assertGov(role);

  const count = await prisma.govProgram.count({ where: { ownerId: userId } });
  if (count >= MAX_PROGRAMS) {
    throw new Error(`Pode ter até ${MAX_PROGRAMS} programas.`);
  }

  const data = readProgram(input);
  const created = await prisma.govProgram.create({ data: { ownerId: userId, ...data } });
  return getProgram(userId, role, created.id);
}

export async function updateProgram(userId: string, role: string | undefined, id: string, input: any) {
  const program = await ownProgram(userId, role, id);
  if (program.ownerId !== userId) {
    throw new Error("Só a instituição dona do programa o pode editar.");
  }

  const data = readProgram(input, program);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  await prisma.govProgram.update({ where: { id }, data });
  return getProgram(userId, role, id);
}

export async function deleteProgram(userId: string, role: string | undefined, id: string) {
  const program = await ownProgram(userId, role, id);
  if (program.ownerId !== userId) {
    throw new Error("Só a instituição dona do programa o pode apagar.");
  }

  await prisma.govProgram.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Projetos do programa ----------
export async function linkProject(userId: string, role: string | undefined, id: string, projectId: string) {
  const program = await ownProgram(userId, role, id);
  if (program.ownerId !== userId) {
    throw new Error("Só a instituição dona do programa lhe pode juntar projetos.");
  }

  const project = await prisma.ngoProject.findUnique({ where: { id: String(projectId ?? "") } });
  if (!project || project.ownerId !== userId) {
    throw new Error("Projeto não encontrado.");
  }

  const other = await prisma.govProgramProject.findUnique({ where: { projectId: project.id } });
  if (other) {
    throw new Error(other.programId === id ? "Este projeto já está no programa." : "Este projeto já faz parte de outro programa.");
  }

  const count = await prisma.govProgramProject.count({ where: { programId: id } });
  if (count >= MAX_PROJECTS_PER_PROGRAM) {
    throw new Error(`Cada programa aceita até ${MAX_PROJECTS_PER_PROGRAM} projetos.`);
  }

  await prisma.govProgramProject.create({ data: { programId: id, projectId: project.id } });
  return getProgram(userId, role, id);
}

export async function unlinkProject(userId: string, role: string | undefined, id: string, projectId: string) {
  const program = await ownProgram(userId, role, id);
  if (program.ownerId !== userId) {
    throw new Error("Só a instituição dona do programa lhe pode tirar projetos.");
  }

  await prisma.govProgramProject.deleteMany({ where: { programId: id, projectId } });
  return getProgram(userId, role, id);
}

// ---------- Programas públicos (qualquer pessoa) ----------
export async function listPublicPrograms(filters: { area?: string; region?: string; q?: string; status?: string }) {
  const where: any = { isPublic: true };
  if (filters.area && AREA_VALUES.includes(filters.area)) where.area = filters.area;
  if (filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  let programs = await prisma.govProgram.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 });

  if (filters.region) {
    const wanted = plain(filters.region);
    programs = programs.filter((p) => p.regions.length === 0 || p.regions.some((r) => plain(r).includes(wanted) || wanted.includes(plain(r))));
  }
  programs = programs.slice(0, 60);

  const [orgs, stats] = await Promise.all([orgInfo(programs.map((p) => p.ownerId)), programStats(programs.map((p) => p.id))]);

  return programs.map((p) => {
    const { budget, ...rest } = p;
    const s = stats.get(p.id);
    return withDates({
      ...rest,
      projectsCount: s?.projects ?? 0,
      beneficiaries: s?.beneficiaries ?? 0,
      organization: orgs.get(p.ownerId) ?? null,
    });
  });
}

export async function getPublicProgram(viewerId: string, id: string) {
  const program = await prisma.govProgram.findUnique({ where: { id } });
  if (!program || (!program.isPublic && program.ownerId !== viewerId)) {
    throw new Error("Programa não encontrado.");
  }

  const links = await prisma.govProgramProject.findMany({ where: { programId: id } });
  const projects = links.length
    ? await prisma.ngoProject.findMany({
        where: { id: { in: links.map((l) => l.projectId) }, isPublic: true },
        select: { id: true, name: true, status: true, area: true, region: true, coverUrl: true, startDate: true, endDate: true },
      })
    : [];
  const projectIds = projects.map((p) => p.id);

  const [orgs, results, bens] = await Promise.all([
    orgInfo([program.ownerId]),
    resultsOf(projectIds),
    projectIds.length
      ? prisma.ngoBeneficiary.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _count: { _all: true } })
      : Promise.resolve([] as any[]),
  ]);
  const benMap = new Map<string, number>();
  (bens as any[]).forEach((b) => b.projectId && benMap.set(b.projectId, b._count._all));

  const { budget, ...rest } = program;
  const isOwner = program.ownerId === viewerId;

  return {
    program: withDates({
      ...rest,
      ...(isOwner ? { budget } : {}),
      projectsCount: projects.length,
      beneficiaries: projects.reduce((s, p) => s + (benMap.get(p.id) ?? 0), 0),
    }),
    organization: orgs.get(program.ownerId) ?? null,
    projects: projects.map((p) => ({ ...p, beneficiaries: benMap.get(p.id) ?? 0 })),
    results,
  };
}
