import { prisma } from "../lib/prisma";
import { AREAS, NEED_CATEGORIES, PROJECT_STATUS, RESULT_INDICATORS } from "../lib/ngoCatalog";
import { BOUNDS, REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { assertNgo } from "./organizationService";
import { distinctBeneficiaries, isYouth } from "./ngoCommunityService";
import { financeReport } from "./ngoFinanceService";

const DAY = 86400000;
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fmt(n: number): string {
  const r = Math.round((Number(n) || 0) * 10) / 10;
  const [int, dec] = String(r).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (dec ? `,${dec}` : "");
}

function dateText(value: any): string {
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function readRange(from?: string, to?: string) {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const d = new Date(from);
    if (isNaN(d.getTime())) throw new Error("Data inicial inválida.");
    range.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (isNaN(d.getTime())) throw new Error("Data final inválida.");
    d.setHours(23, 59, 59, 999);
    range.lte = d;
  }
  return range;
}

function hasRange(range: { gte?: Date; lte?: Date }) {
  return !!(range.gte || range.lte);
}

function personKey(b: { userId: string | null; phone: string | null; name: string; communityId: string | null; region: string | null }) {
  if (b.userId) return `u:${b.userId}`;
  if (b.phone) return `p:${b.phone.replace(/\D/g, "")}`;
  return `n:${plain(b.name)}|${b.communityId ?? plain(b.region)}`;
}

function label(list: { value: string; label: string }[], value: string) {
  return list.find((o) => o.value === value)?.label ?? value;
}

async function ownProject(userId: string, id: string) {
  const project = await prisma.ngoProject.findUnique({ where: { id } });
  if (!project || project.ownerId !== userId) {
    throw new Error("Projeto não encontrado.");
  }
  return project;
}

// =====================================================================
// 1. Início
// =====================================================================
export async function getHome(userId: string, role: string | undefined) {
  assertNgo(role);

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * DAY);
  const in14 = new Date(now.getTime() + 14 * DAY);

  const [
    projectGroups,
    communities,
    benRows,
    openNeeds,
    dueProjects,
    opportunities,
    org,
    newForMe,
    openRequests,
    unread,
    trainingsSoon,
    fundingDue,
    updates,
  ] = await Promise.all([
    prisma.ngoProject.groupBy({ by: ["status"], where: { ownerId: userId }, _count: { _all: true } }),
    prisma.ngoCommunity.count({ where: { ownerId: userId } }),
    prisma.ngoBeneficiary.findMany({
      where: { ownerId: userId },
      select: { userId: true, phone: true, name: true, communityId: true, region: true },
    }),
    prisma.ngoNeed.findMany({
      where: { ownerId: userId, status: { not: "ATENDIDA" } },
      select: { id: true, priority: true, category: true, description: true, communityId: true, region: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.ngoProject.findMany({
      where: { ownerId: userId, status: { in: ["PLANEAMENTO", "EM_ANDAMENTO"] }, endDate: { not: null, lte: in14 } },
      select: { id: true, name: true, status: true, endDate: true },
      orderBy: { endDate: "asc" },
      take: 10,
    }),
    prisma.opportunity.findMany({ where: { ownerId: userId }, select: { id: true, status: true, deadline: true } }),
    prisma.organization.findUnique({ where: { ownerId: userId }, select: { name: true, verificationStatus: true } }),
    prisma.ngoSupportRequest.count({ where: { organizationId: userId, status: "NOVO" } }),
    prisma.ngoSupportRequest.count({ where: { organizationId: null, status: "NOVO" } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.training.findMany({
      where: { ownerId: userId, status: "ABERTA", startsAt: { gte: now, lte: in7 } },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.ngoFunding.findMany({
      where: { ownerId: userId, status: { in: ["PROSPECCAO", "SOLICITADO", "APROVADO"] }, dueDate: { not: null, lte: in14 } },
      select: { id: true, title: true, dueDate: true, status: true, amount: true },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    prisma.ngoProjectUpdate.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const byStatus: Record<string, number> = {};
  projectGroups.forEach((g) => (byStatus[g.status] = g._count._all));
  const total = projectGroups.reduce((s, g) => s + g._count._all, 0);

  const people = distinctBeneficiaries(benRows);
  const reached = new Set(benRows.map((b) => b.communityId).filter(Boolean)).size;

  const openOpportunities = opportunities.filter(
    (o) => o.status === "ABERTA" && (!o.deadline || new Date(o.deadline).getTime() >= now.getTime())
  );
  const pendingApplications = opportunities.length
    ? await prisma.opportunityApplication.count({
        where: { opportunityId: { in: opportunities.map((o) => o.id) }, status: { in: ["ENVIADA", "EM_ANALISE"] } },
      })
    : 0;

  const urgent = openNeeds.filter((n) => n.priority === "URGENTE");
  const urgentCommunityIds = Array.from(new Set(urgent.slice(0, 3).map((n) => n.communityId).filter(Boolean))) as string[];
  const urgentCommunities = urgentCommunityIds.length
    ? await prisma.ngoCommunity.findMany({ where: { id: { in: urgentCommunityIds } }, select: { id: true, name: true } })
    : [];
  const communityNames = new Map(urgentCommunities.map((c) => [c.id, c.name]));

  const projectIds = Array.from(new Set(updates.map((u) => u.projectId)));
  const updateProjects = projectIds.length
    ? await prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const projectNames = new Map(updateProjects.map((p) => [p.id, p.name]));

  // ---------- Alertas ----------
  const alerts: { key: string; level: string; title: string; detail: string; target: { screen: string; id?: string } }[] = [];

  const verification = org?.verificationStatus ?? "NAO_ENVIADO";
  if (verification !== "APROVADO") {
    alerts.push({
      key: "verification",
      level: verification === "RECUSADO" ? "ALTA" : "INFO",
      title:
        verification === "PENDENTE"
          ? "Verificação em análise"
          : verification === "RECUSADO"
          ? "Verificação recusada"
          : "Organização ainda não verificada",
      detail:
        verification === "PENDENTE"
          ? "A equipa do NÔDJUNTA AGRO está a analisar os seus documentos."
          : "Complete os dados e envie os documentos para ganhar o selo de ONG verificada.",
      target: { screen: "verification" },
    });
  }

  if (urgent.length > 0) {
    const first = urgent[0];
    const where = first.communityId ? communityNames.get(first.communityId) : first.region;
    alerts.push({
      key: "urgent-needs",
      level: "ALTA",
      title: `${urgent.length} necessidade(s) urgente(s) por atender`,
      detail: `${label(NEED_CATEGORIES, first.category)}${where ? ` em ${where}` : ""}: ${first.description}`,
      target: { screen: "needs" },
    });
  }

  dueProjects.forEach((p) => {
    const days = Math.ceil((new Date(p.endDate as Date).getTime() - now.getTime()) / DAY);
    if (days < 0) {
      alerts.push({
        key: `late-${p.id}`,
        level: "ALTA",
        title: `Projeto atrasado: ${p.name}`,
        detail: `Devia terminar em ${dateText(p.endDate)}. Atualize o estado ou a data.`,
        target: { screen: "project", id: p.id },
      });
    } else {
      alerts.push({
        key: `ending-${p.id}`,
        level: "MEDIA",
        title: `Projeto a terminar: ${p.name}`,
        detail: days === 0 ? "Termina hoje." : `Faltam ${days} dia(s).`,
        target: { screen: "project", id: p.id },
      });
    }
  });

  if (newForMe > 0) {
    alerts.push({
      key: "requests",
      level: "MEDIA",
      title: `${newForMe} novo(s) pedido(s) de apoio`,
      detail: "Pessoas e comunidades pediram apoio à sua organização.",
      target: { screen: "requests" },
    });
  }

  if (pendingApplications > 0) {
    alerts.push({
      key: "applications",
      level: "MEDIA",
      title: `${pendingApplications} candidatura(s) por analisar`,
      detail: "Responda às pessoas que se candidataram às suas oportunidades.",
      target: { screen: "opportunities" },
    });
  }

  trainingsSoon.forEach((t) => {
    alerts.push({
      key: `training-${t.id}`,
      level: "INFO",
      title: `Formação em breve: ${t.title}`,
      detail: `Começa em ${dateText(t.startsAt)}.`,
      target: { screen: "training", id: t.id },
    });
  });

  fundingDue.forEach((f) => {
    const overdue = new Date(f.dueDate as Date).getTime() < now.getTime();
    alerts.push({
      key: `funding-${f.id}`,
      level: overdue ? "ALTA" : "MEDIA",
      title: `${overdue ? "Prazo de financiamento passou" : "Prazo de financiamento perto"}: ${f.title}`,
      detail: `Data limite: ${dateText(f.dueDate)}.`,
      target: { screen: "funding" },
    });
  });

  alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return {
    organization: { name: org?.name ?? null, verificationStatus: verification, isVerified: verification === "APROVADO" },
    projects: {
      total,
      active: (byStatus.PLANEAMENTO ?? 0) + (byStatus.EM_ANDAMENTO ?? 0),
      inProgress: byStatus.EM_ANDAMENTO ?? 0,
      completed: byStatus.CONCLUIDO ?? 0,
      byStatus,
    },
    communities: { registered: communities, reached },
    beneficiaries: { total: people.length, registrations: benRows.length },
    opportunities: { open: openOpportunities.length, pendingApplications },
    requests: { newForMe, open: openRequests },
    needs: { open: openNeeds.length, urgent: urgent.length },
    alerts,
    recentUpdates: updates.map((u) => ({
      id: u.id,
      projectId: u.projectId,
      projectName: projectNames.get(u.projectId) ?? "Projeto",
      title: u.title,
      progress: u.progress,
      createdAt: u.createdAt,
    })),
    unreadNotifications: unread,
  };
}

// =====================================================================
// 9. Monitoramento e resultados
// =====================================================================
export async function getMonitoring(
  userId: string,
  role: string | undefined,
  filters: { projectId?: string; from?: string; to?: string }
) {
  assertNgo(role);

  const range = readRange(filters.from, filters.to);
  const project = filters.projectId ? await ownProject(userId, filters.projectId) : null;

  const benWhere: any = { ownerId: userId };
  const resultWhere: any = { ownerId: userId };
  const trainingWhere: any = { ownerId: userId, status: { not: "CANCELADA" } };
  if (project) {
    benWhere.projectId = project.id;
    resultWhere.projectId = project.id;
    trainingWhere.projectId = project.id;
  }
  if (hasRange(range)) {
    benWhere.createdAt = range;
    resultWhere.recordedAt = range;
    trainingWhere.startsAt = range;
  }

  const [rows, results, trainings] = await Promise.all([
    prisma.ngoBeneficiary.findMany({
      where: benWhere,
      select: {
        userId: true,
        phone: true,
        name: true,
        communityId: true,
        region: true,
        projectId: true,
        sector: true,
        gender: true,
        birthYear: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ngoResult.findMany({ where: resultWhere }),
    prisma.training.findMany({ where: trainingWhere, select: { id: true } }),
  ]);

  const people = distinctBeneficiaries(rows);

  // Resultados por tipo
  const sums = new Map<string, { indicator: string; label: string; unit: string; value: number }>();
  results.forEach((r) => {
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
  const sumOf = (indicator: string) => sums.get(indicator)?.value ?? 0;

  // Formação
  const trainingIds = trainings.map((t) => t.id);
  const enrollRows = trainingIds.length
    ? await prisma.trainingEnrollment.groupBy({
        by: ["status"],
        where: { trainingId: { in: trainingIds } },
        _count: { _all: true },
      })
    : [];
  const enrollCount = (status: string) => enrollRows.find((e) => e.status === status)?._count._all ?? 0;
  const trainedInApp = enrollCount("CONCLUIDO");
  const trainedManual = Math.round(sumOf("PESSOAS_FORMADAS"));
  const participants = enrollRows.filter((e) => e.status !== "CANCELADO").reduce((s, e) => s + e._count._all, 0);

  // Por região
  const regionMap = new Map<string, any[]>();
  rows.forEach((b) => {
    const name = findRegion(b.region)?.name ?? (b.region ? b.region : "Sem região");
    regionMap.set(name, [...(regionMap.get(name) ?? []), b]);
  });
  const byRegion = Array.from(regionMap.entries())
    .map(([name, list]) => ({ region: name, beneficiaries: distinctBeneficiaries(list).length }))
    .sort((a, b) => b.beneficiaries - a.beneficiaries);

  // Evolução mensal (pessoas novas por mês)
  const seen = new Set<string>();
  const perMonth = new Map<string, number>();
  rows.forEach((b) => {
    const key = personKey(b);
    if (seen.has(key)) return;
    seen.add(key);
    const month = new Date(b.createdAt).toISOString().slice(0, 7);
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  });

  const timeline: { month: string; added: number; total: number }[] = [];
  const base = new Date();
  base.setDate(1);
  let before = 0;
  const firstWindow = new Date(base.getFullYear(), base.getMonth() - 11, 1).toISOString().slice(0, 7);
  perMonth.forEach((count, month) => {
    if (month < firstWindow) before += count;
  });
  let running = before;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    const added = perMonth.get(month) ?? 0;
    running += added;
    timeline.push({ month, added, total: running });
  }

  const totals = {
    beneficiaries: people.length,
    registrations: rows.length,
    farmers: people.filter((p) => p.sector === "AGRICULTURA").length,
    fishers: people.filter((p) => p.sector === "PESCA").length,
    artisans: people.filter((p) => p.sector === "ARTESANATO").length,
    cooperatives: people.filter((p) => p.sector === "COOPERATIVA").length,
    youth: people.filter((p) => isYouth(p.birthYear)).length,
    women: people.filter((p) => p.gender === "F").length,
    communitiesReached: new Set(rows.map((b) => b.communityId).filter(Boolean)).size,
    regionsReached: byRegion.filter((r) => r.region !== "Sem região").length,
    productionKg: sumOf("PRODUCAO_KG"),
    fishKg: sumOf("PESCADO_KG"),
    jobsCreated: Math.round(sumOf("EMPREGOS_CRIADOS")),
    areaHa: sumOf("AREA_CULTIVADA_HA"),
    families: Math.round(sumOf("FAMILIAS_APOIADAS")),
    equipment: Math.round(sumOf("EQUIPAMENTOS_ENTREGUES")),
    peopleTrained: trainedInApp + trainedManual,
    trainedInApp,
    trainedManual,
    trainings: trainings.length,
    trainingParticipants: participants,
  };

  const resultList = Array.from(sums.values()).sort((a, b) => b.value - a.value);

  // Impacto por projeto
  let projects: any[] = [];
  if (!project) {
    const list = await prisma.ngoProject.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, name: true, status: true, area: true, region: true, targetBeneficiaries: true },
    });
    const ids = list.map((p) => p.id);

    const [allResults, updates] = ids.length
      ? await Promise.all([
          prisma.ngoResult.findMany({ where: { projectId: { in: ids }, ...(hasRange(range) ? { recordedAt: range } : {}) } }),
          prisma.ngoProjectUpdate.groupBy({
            by: ["projectId"],
            where: { projectId: { in: ids } },
            _count: { _all: true },
            _max: { createdAt: true, progress: true },
          }),
        ])
      : [[], []];

    const updateMap = new Map((updates as any[]).map((u) => [u.projectId, u]));

    projects = list.map((p) => {
      const benefs = distinctBeneficiaries(rows.filter((b) => b.projectId === p.id)).length;
      const own = (allResults as any[]).filter((r) => r.projectId === p.id);
      const update = updateMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        statusLabel: label(PROJECT_STATUS, p.status),
        area: p.area,
        areaLabel: label(AREAS, p.area),
        region: p.region,
        beneficiaries: benefs,
        target: p.targetBeneficiaries,
        targetPercent: p.targetBeneficiaries ? Math.min(100, Math.round((benefs / p.targetBeneficiaries) * 100)) : null,
        resultsCount: own.length,
        updatesCount: update?._count._all ?? 0,
        progress: update?._max.progress ?? null,
        lastUpdate: update?._max.createdAt ?? null,
      };
    });
  }

  return {
    period: { from: range.gte ?? null, to: range.lte ?? null },
    scope: project ? "PROJECT" : "ORGANIZATION",
    project: project
      ? {
          id: project.id,
          name: project.name,
          status: project.status,
          target: project.targetBeneficiaries,
          beneficiaries: people.length,
          targetPercent: project.targetBeneficiaries
            ? Math.min(100, Math.round((people.length / project.targetBeneficiaries) * 100))
            : null,
        }
      : null,
    totals,
    results: resultList,
    byRegion,
    timeline,
    projects,
    note: "Os números vêm dos registos feitos pela organização no app. Uma pessoa apoiada em vários projetos conta uma só vez.",
  };
}

// =====================================================================
// 9. Relatórios
// =====================================================================
export async function getReport(
  userId: string,
  role: string | undefined,
  filters: { projectId?: string; from?: string; to?: string; includeFinance?: boolean }
) {
  assertNgo(role);

  const range = readRange(filters.from, filters.to);
  const monitoring = await getMonitoring(userId, role, filters);
  const t = monitoring.totals;

  const needWhere: any = { ownerId: userId };
  if (filters.projectId) needWhere.projectId = filters.projectId;

  const [org, needs, updates, projectsList, finance] = await Promise.all([
    prisma.organization.findUnique({ where: { ownerId: userId }, select: { name: true } }),
    prisma.ngoNeed.groupBy({ by: ["status"], where: needWhere, _count: { _all: true } }),
    prisma.ngoProjectUpdate.findMany({
      where: {
        authorId: userId,
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(hasRange(range) ? { createdAt: range } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    filters.projectId
      ? Promise.resolve([] as any[])
      : prisma.ngoProject.findMany({
          where: { ownerId: userId },
          orderBy: { updatedAt: "desc" },
          take: 30,
          select: { id: true, name: true, status: true, region: true, startDate: true, endDate: true },
        }),
    filters.includeFinance
      ? financeReport(userId, role, { projectId: filters.projectId, from: filters.from, to: filters.to })
      : Promise.resolve(null),
  ]);

  const needCount = (status: string) => needs.find((n) => n.status === status)?._count._all ?? 0;
  const needsServed = needCount("ATENDIDA");
  const needsOpen = needCount("IDENTIFICADA") + needCount("EM_APOIO");

  const projectIds = Array.from(new Set(updates.map((u) => u.projectId)));
  const updateProjects = projectIds.length
    ? await prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const projectNames = new Map(updateProjects.map((p) => [p.id, p.name]));

  const period = `${range.gte ? dateText(range.gte) : "início"} a ${range.lte ? dateText(range.lte) : "hoje"}`;

  const lines: string[] = [
    `RELATÓRIO DE IMPACTO${org ? ` - ${org.name}` : ""}`,
    `Período: ${period}`,
    monitoring.project ? `Projeto: ${monitoring.project.name}` : "Todos os projetos",
    "",
    "BENEFICIÁRIOS",
    `Pessoas apoiadas: ${fmt(t.beneficiaries)}`,
    `Agricultores: ${fmt(t.farmers)} | Pescadores: ${fmt(t.fishers)} | Artesãos: ${fmt(t.artisans)}`,
    `Mulheres: ${fmt(t.women)} | Jovens (15 a 35 anos): ${fmt(t.youth)}`,
    `Comunidades alcançadas: ${fmt(t.communitiesReached)} | Regiões: ${fmt(t.regionsReached)}`,
  ];

  if (monitoring.project?.target) {
    lines.push(
      `Meta do projeto: ${fmt(monitoring.project.target)} beneficiários (${monitoring.project.targetPercent ?? 0}% alcançado)`
    );
  }

  if (monitoring.results.length > 0) {
    lines.push("", "RESULTADOS");
    monitoring.results.forEach((r) => lines.push(`- ${r.label}: ${fmt(r.value)}${r.unit ? ` ${r.unit}` : ""}`));
  }

  lines.push(
    "",
    "FORMAÇÃO",
    `Formações realizadas: ${fmt(t.trainings)} | Participantes: ${fmt(t.trainingParticipants)}`,
    `Pessoas formadas: ${fmt(t.peopleTrained)}`,
    "",
    "NECESSIDADES",
    `Em aberto: ${fmt(needsOpen)} | Atendidas: ${fmt(needsServed)}`
  );

  if (projectsList.length > 0) {
    lines.push("", "PROJETOS");
    projectsList.forEach((p: any) =>
      lines.push(`- ${p.name} (${label(PROJECT_STATUS, p.status)}${p.region ? `, ${p.region}` : ""})`)
    );
  }

  if (updates.length > 0) {
    lines.push("", "ÚLTIMAS ATUALIZAÇÕES");
    updates.forEach((u) =>
      lines.push(`- ${dateText(u.createdAt)} ${projectNames.get(u.projectId) ?? "Projeto"}: ${u.title}`)
    );
  }

  if (finance) {
    lines.push(
      "",
      "FINANÇAS",
      `Recebido: ${fmt(finance.totals.received)} FCFA | Gasto: ${fmt(finance.totals.spent)} FCFA | Saldo: ${fmt(finance.totals.balance)} FCFA`
    );
  }

  lines.push("", `Gerado em ${dateText(new Date())} pelo NÔDJUNTA AGRO, com base nos registos da organização.`);

  return {
    organization: org?.name ?? null,
    period: monitoring.period,
    monitoring,
    needs: { open: needsOpen, served: needsServed },
    recentUpdates: updates.map((u) => ({
      id: u.id,
      projectName: projectNames.get(u.projectId) ?? "Projeto",
      title: u.title,
      createdAt: u.createdAt,
    })),
    projects: projectsList,
    finance: finance ? { totals: finance.totals } : null,
    text: lines.join("\n"),
  };
}

// =====================================================================
// 10. Mapa
// =====================================================================
function place(lat: number | null, lng: number | null, regionText: string | null) {
  if (lat !== null && lng !== null) {
    return { lat, lng, approximate: false, region: nearestRegion(lat, lng)?.name ?? regionText ?? null };
  }
  const region = findRegion(regionText);
  if (region) {
    return { lat: region.lat, lng: region.lng, approximate: true, region: region.name };
  }
  return null;
}

export async function getMap(
  userId: string,
  role: string | undefined,
  filters: { layers?: string; scope?: string }
) {
  assertNgo(role);

  const layers = new Set(
    (filters.layers ?? "projects,communities,regions,trainings")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const everyone = filters.scope === "all";
  const now = new Date();

  const points: any[] = [];
  let unplaced = 0;

  // Projetos
  if (layers.has("projects")) {
    const projects = await prisma.ngoProject.findMany({
      where: everyone ? { OR: [{ ownerId: userId }, { isPublic: true }] } : { ownerId: userId },
      select: { id: true, ownerId: true, name: true, area: true, status: true, region: true, lat: true, lng: true },
      take: 300,
    });
    projects.forEach((p) => {
      const spot = place(p.lat, p.lng, p.region);
      if (!spot) {
        unplaced += 1;
        return;
      }
      points.push({
        layer: "projects",
        id: p.id,
        name: p.name,
        area: p.area,
        status: p.status,
        isMine: p.ownerId === userId,
        ...spot,
      });
    });
  }

  // Comunidades apoiadas
  if (layers.has("communities")) {
    const communities = await prisma.ngoCommunity.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, type: true, region: true, lat: true, lng: true, population: true },
      take: 300,
    });
    communities.forEach((c) => {
      const spot = place(c.lat, c.lng, c.region);
      if (!spot) {
        unplaced += 1;
        return;
      }
      points.push({ layer: "communities", id: c.id, name: c.name, type: c.type, population: c.population, isMine: true, ...spot });
    });
  }

  // Centros de formação (formações abertas de todas as organizações)
  if (layers.has("trainings")) {
    const trainings = await prisma.training.findMany({
      where: { status: "ABERTA", isOnline: false, OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] },
      select: { id: true, ownerId: true, title: true, kind: true, startsAt: true, region: true, location: true, lat: true, lng: true },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
    trainings.forEach((t) => {
      const spot = place(t.lat, t.lng, t.region ?? t.location);
      if (!spot) {
        unplaced += 1;
        return;
      }
      points.push({
        layer: "trainings",
        id: t.id,
        name: t.title,
        kind: t.kind,
        startsAt: t.startsAt,
        isMine: t.ownerId === userId,
        ...spot,
      });
    });
  }

  // Resumo por região
  let regions: any[] = [];
  let unmatched = { farmers: 0, fishers: 0, artisans: 0, cooperatives: 0 };

  if (layers.has("regions")) {
    const [users, coops, benRows, needs, projects, communities] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["AGRICULTOR", "PESCADOR", "ARTESAO"] as any }, isActive: true },
        select: { role: true, location: true },
        take: 20000,
      }),
      prisma.cooperative.findMany({ select: { region: true } }),
      prisma.ngoBeneficiary.findMany({
        where: { ownerId: userId },
        select: { userId: true, phone: true, name: true, communityId: true, region: true },
      }),
      prisma.ngoNeed.findMany({
        where: { ownerId: userId, status: { not: "ATENDIDA" } },
        select: { region: true, priority: true, category: true },
      }),
      prisma.ngoProject.findMany({ where: { ownerId: userId }, select: { region: true, lat: true, lng: true } }),
      prisma.ngoCommunity.findMany({ where: { ownerId: userId }, select: { region: true, lat: true, lng: true } }),
    ]);

    const stats = new Map<string, any>();
    REGIONS.forEach((r) =>
      stats.set(r.key, {
        key: r.key,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        farmers: 0,
        fishers: 0,
        artisans: 0,
        cooperatives: 0,
        projects: 0,
        communities: 0,
        beneficiaries: 0,
        openNeeds: 0,
        urgentNeeds: 0,
        needCategories: new Map<string, number>(),
      })
    );

    users.forEach((u) => {
      const region = findRegion(u.location);
      const field = u.role === "AGRICULTOR" ? "farmers" : u.role === "PESCADOR" ? "fishers" : "artisans";
      if (region) stats.get(region.key)[field] += 1;
      else unmatched[field] += 1;
    });

    coops.forEach((c) => {
      const region = findRegion(c.region);
      if (region) stats.get(region.key).cooperatives += 1;
      else unmatched.cooperatives += 1;
    });

    const byRegion = new Map<string, any[]>();
    benRows.forEach((b) => {
      const region = findRegion(b.region);
      if (region) byRegion.set(region.key, [...(byRegion.get(region.key) ?? []), b]);
    });
    byRegion.forEach((list, key) => (stats.get(key).beneficiaries = distinctBeneficiaries(list).length));

    needs.forEach((n) => {
      const region = findRegion(n.region);
      if (!region) return;
      const s = stats.get(region.key);
      s.openNeeds += 1;
      if (n.priority === "URGENTE") s.urgentNeeds += 1;
      s.needCategories.set(n.category, (s.needCategories.get(n.category) ?? 0) + 1);
    });

    const regionOf = (item: { region: string | null; lat: number | null; lng: number | null }) =>
      findRegion(item.region) ?? (item.lat !== null && item.lng !== null ? nearestRegion(item.lat, item.lng) : null);

    projects.forEach((p) => {
      const region = regionOf(p);
      if (region) stats.get(region.key).projects += 1;
    });
    communities.forEach((c) => {
      const region = regionOf(c);
      if (region) stats.get(region.key).communities += 1;
    });

    regions = Array.from(stats.values()).map((s) => ({
      key: s.key,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      farmers: s.farmers,
      fishers: s.fishers,
      artisans: s.artisans,
      cooperatives: s.cooperatives,
      projects: s.projects,
      communities: s.communities,
      beneficiaries: s.beneficiaries,
      needs: {
        open: s.openNeeds,
        urgent: s.urgentNeeds,
        byCategory: Array.from(s.needCategories.entries() as Iterable<[string, number]>)
          .map(([category, count]) => ({ category, label: label(NEED_CATEGORIES, category), count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      },
    }));
  }

  return {
    bounds: BOUNDS,
    scope: everyone ? "all" : "mine",
    points,
    unplaced,
    regions,
    unmatched,
    note:
      "Os pontos sem coordenadas aparecem no centro da região (aproximado). Os números de agricultores, pescadores, artesãos e cooperativas são totais por região e não mostram dados pessoais.",
  };
}
