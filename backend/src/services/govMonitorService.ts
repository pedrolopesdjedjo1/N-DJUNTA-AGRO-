import { prisma } from "../lib/prisma";
import { REGIONS, findRegion, nearestRegion } from "../lib/ngoRegions";
import { assertGov } from "./organizationService";
import { distinctBeneficiaries } from "./ngoCommunityService";
import { getMap } from "./ngoMonitorService";

const DAY = 86400000;
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };
const OPEN_REPORT = ["RECEBIDO", "EM_ANALISE", "ENCAMINHADO"];
const SEVERITY_RANK: Record<string, number> = { INFO: 0, ATENCAO: 1, ALERTA: 2, EMERGENCIA: 3 };

function dateText(value: any): string {
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// =====================================================================
// Início
// =====================================================================
export async function getHome(userId: string, role: string | undefined) {
  assertGov(role);

  const now = new Date();
  const in1 = new Date(now.getTime() + DAY);
  const in7 = new Date(now.getTime() + 7 * DAY);
  const in14 = new Date(now.getTime() + 14 * DAY);
  const month = new Date(now.getTime() - 30 * DAY);

  const [
    org,
    programGroups,
    projectGroups,
    communities,
    benRows,
    newForMe,
    openReports,
    urgentReports,
    dueProjects,
    duePrograms,
    opportunities,
    trainingsSoon,
    alertsEnding,
    unavailableServices,
    damagedPlaces,
    sos,
    unread,
    updates,
    recentReports,
    farmers,
    fishers,
    cooperatives,
    productsListed,
    ordersMonth,
    publicProjects,
    activeAlerts,
    openNeeds,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { name: true, verificationStatus: true, institutionType: true },
    }),
    prisma.govProgram.groupBy({ by: ["status"], where: { ownerId: userId }, _count: { _all: true } }),
    prisma.ngoProject.groupBy({ by: ["status"], where: { ownerId: userId }, _count: { _all: true } }),
    prisma.ngoCommunity.count({ where: { ownerId: userId } }),
    prisma.ngoBeneficiary.findMany({
      where: { ownerId: userId },
      select: { userId: true, phone: true, name: true, communityId: true, region: true },
    }),
    prisma.citizenReport.count({ where: { institutionId: userId, status: "RECEBIDO" } }),
    prisma.citizenReport.count({ where: { institutionId: null, status: "RECEBIDO" } }),
    prisma.citizenReport.count({ where: { institutionId: userId, priority: "URGENTE", status: { in: OPEN_REPORT } } }),
    prisma.ngoProject.findMany({
      where: { ownerId: userId, status: { in: ["PLANEAMENTO", "EM_ANDAMENTO"] }, endDate: { not: null, lte: in14 } },
      select: { id: true, name: true, endDate: true },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
    prisma.govProgram.findMany({
      where: { ownerId: userId, status: { in: ["PLANEAMENTO", "EM_ANDAMENTO"] }, endDate: { not: null, lte: in14 } },
      select: { id: true, name: true, endDate: true },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
    prisma.opportunity.findMany({ where: { ownerId: userId }, select: { id: true, status: true, deadline: true } }),
    prisma.training.findMany({
      where: { ownerId: userId, status: "ABERTA", startsAt: { gte: now, lte: in7 } },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.officialAlert.findMany({
      where: { ownerId: userId, isActive: true, expiresAt: { not: null, gt: now, lte: in1 } },
      select: { id: true, title: true, expiresAt: true },
      take: 3,
    }),
    prisma.publicService.count({ where: { ownerId: userId, status: { in: ["TEMPORARIO", "ENCERRADO"] } } }),
    prisma.govPlace.count({ where: { ownerId: userId, status: "DANIFICADA" } }),
    prisma.sosAlert.count({ where: { status: { in: ["ABERTO", "EM_RESGATE"] as any } } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.ngoProjectUpdate.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.citizenReport.findMany({
      where: { OR: [{ institutionId: userId }, { institutionId: null }], status: "RECEBIDO" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, protocol: true, category: true, title: true, region: true, priority: true, createdAt: true, institutionId: true },
    }),
    prisma.user.count({ where: { role: "AGRICULTOR" as any, isActive: true } }),
    prisma.user.count({ where: { role: "PESCADOR" as any, isActive: true } }),
    prisma.cooperative.count(),
    prisma.product.count({ where: { isAvailable: true } }),
    prisma.order.count({ where: { status: "CONCLUIDO", updatedAt: { gte: month } } }),
    prisma.ngoProject.count({ where: { isPublic: true } }),
    prisma.officialAlert.count({ where: { ownerId: userId, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    prisma.ngoNeed.findMany({
      where: { ownerId: userId, status: { not: "ATENDIDA" } },
      select: { priority: true },
      take: 500,
    }),
  ]);

  const programsByStatus: Record<string, number> = {};
  programGroups.forEach((g) => (programsByStatus[g.status] = g._count._all));
  const projectsByStatus: Record<string, number> = {};
  projectGroups.forEach((g) => (projectsByStatus[g.status] = g._count._all));

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

  const projectIds = Array.from(new Set(updates.map((u) => u.projectId)));
  const updateProjects = projectIds.length
    ? await prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const projectNames = new Map(updateProjects.map((p) => [p.id, p.name]));

  // ---------- Alertas importantes ----------
  const alerts: { key: string; level: string; title: string; detail: string; target: { screen: string; id?: string } }[] = [];

  if (sos > 0) {
    alerts.push({
      key: "sos",
      level: "ALTA",
      title: `${sos} pedido(s) de socorro no mar ativo(s)`,
      detail: "Pescadores pediram ajuda pelo app. Veja a localização e coordene o resgate.",
      target: { screen: "sos" },
    });
  }

  if (urgentReports > 0) {
    alerts.push({
      key: "urgent-reports",
      level: "ALTA",
      title: `${urgentReports} pedido(s) urgente(s) dos cidadãos`,
      detail: "Pedidos e denúncias marcados como urgentes ainda por resolver.",
      target: { screen: "reports" },
    });
  }

  if (newForMe > 0) {
    alerts.push({
      key: "new-reports",
      level: "MEDIA",
      title: `${newForMe} novo(s) pedido(s) dos cidadãos`,
      detail: "Pedidos, problemas e denúncias dirigidos à sua instituição.",
      target: { screen: "reports" },
    });
  }

  if (openReports > 0) {
    alerts.push({
      key: "open-reports",
      level: "INFO",
      title: `${openReports} pedido(s) aberto(s) a todas as instituições`,
      detail: "Ninguém os assumiu ainda. Pode assumir os que são da sua área.",
      target: { screen: "reports" },
    });
  }

  dueProjects.forEach((p) => {
    const days = Math.ceil((new Date(p.endDate as Date).getTime() - now.getTime()) / DAY);
    alerts.push({
      key: `project-${p.id}`,
      level: days < 0 ? "ALTA" : "MEDIA",
      title: days < 0 ? `Projeto atrasado: ${p.name}` : `Projeto a terminar: ${p.name}`,
      detail: days < 0 ? `Devia terminar em ${dateText(p.endDate)}.` : days === 0 ? "Termina hoje." : `Faltam ${days} dia(s).`,
      target: { screen: "project", id: p.id },
    });
  });

  duePrograms.forEach((p) => {
    const days = Math.ceil((new Date(p.endDate as Date).getTime() - now.getTime()) / DAY);
    alerts.push({
      key: `program-${p.id}`,
      level: days < 0 ? "ALTA" : "MEDIA",
      title: days < 0 ? `Programa atrasado: ${p.name}` : `Programa a terminar: ${p.name}`,
      detail: days < 0 ? `Devia terminar em ${dateText(p.endDate)}.` : days === 0 ? "Termina hoje." : `Faltam ${days} dia(s).`,
      target: { screen: "program", id: p.id },
    });
  });

  alertsEnding.forEach((a) => {
    alerts.push({
      key: `alert-${a.id}`,
      level: "MEDIA",
      title: `Alerta oficial a terminar: ${a.title}`,
      detail: `Termina em ${dateText(a.expiresAt)}. Prolongue-o ou termine-o.`,
      target: { screen: "alerts" },
    });
  });

  if (pendingApplications > 0) {
    alerts.push({
      key: "applications",
      level: "MEDIA",
      title: `${pendingApplications} candidatura(s) por analisar`,
      detail: "Responda às pessoas que se candidataram às suas oportunidades.",
      target: { screen: "opportunities" },
    });
  }

  if (damagedPlaces > 0) {
    alerts.push({
      key: "damaged-places",
      level: "MEDIA",
      title: `${damagedPlaces} local(is) danificado(s)`,
      detail: "Infraestruturas, mercados ou zonas de produção marcados como danificados.",
      target: { screen: "places" },
    });
  }

  if (unavailableServices > 0) {
    alerts.push({
      key: "services",
      level: "INFO",
      title: `${unavailableServices} serviço(s) indisponível(eis)`,
      detail: "Confirme se já voltaram a funcionar e atualize o estado.",
      target: { screen: "services" },
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

  const verification = org?.verificationStatus ?? "NAO_ENVIADO";
  if (verification !== "APROVADO") {
    alerts.push({
      key: "verification",
      level: verification === "RECUSADO" ? "ALTA" : "INFO",
      title:
        verification === "PENDENTE"
          ? "Verificação oficial em análise"
          : verification === "RECUSADO"
          ? "Verificação oficial recusada"
          : "Instituição ainda não verificada",
      detail:
        verification === "PENDENTE"
          ? "A equipa do NÔDJUNTA AGRO está a analisar os documentos."
          : "Complete os dados e envie os documentos para ganhar o selo de instituição verificada.",
      target: { screen: "verification" },
    });
  }

  alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return {
    organization: {
      name: org?.name ?? null,
      institutionType: org?.institutionType ?? null,
      verificationStatus: verification,
      isVerified: verification === "APROVADO",
    },
    programs: {
      total: programGroups.reduce((s, g) => s + g._count._all, 0),
      active: (programsByStatus.PLANEAMENTO ?? 0) + (programsByStatus.EM_ANDAMENTO ?? 0),
      inProgress: programsByStatus.EM_ANDAMENTO ?? 0,
      completed: programsByStatus.CONCLUIDO ?? 0,
      byStatus: programsByStatus,
    },
    projects: {
      total: projectGroups.reduce((s, g) => s + g._count._all, 0),
      active: (projectsByStatus.PLANEAMENTO ?? 0) + (projectsByStatus.EM_ANDAMENTO ?? 0),
      inProgress: projectsByStatus.EM_ANDAMENTO ?? 0,
      completed: projectsByStatus.CONCLUIDO ?? 0,
      byStatus: projectsByStatus,
    },
    communities: { registered: communities, reached },
    beneficiaries: { total: people.length, registrations: benRows.length },
    requests: { newForMe, open: openReports, urgent: urgentReports },
    opportunities: { open: openOpportunities.length, pendingApplications },
    needs: { open: openNeeds.length, urgent: openNeeds.filter((n) => n.priority === "URGENTE").length },
    indicators: {
      farmers,
      fishers,
      cooperatives,
      productsListed,
      ordersMonth,
      publicProjects,
      activeAlerts,
    },
    alerts,
    recentUpdates: updates.map((u) => ({
      id: u.id,
      projectId: u.projectId,
      projectName: projectNames.get(u.projectId) ?? "Projeto",
      title: u.title,
      progress: u.progress,
      createdAt: u.createdAt,
    })),
    recentReports: recentReports.map((r) => ({
      id: r.id,
      protocol: r.protocol,
      category: r.category,
      title: r.title,
      region: r.region,
      priority: r.priority,
      createdAt: r.createdAt,
      isOpenRequest: r.institutionId === null,
    })),
    unreadNotifications: unread,
  };
}

// =====================================================================
// Mapa do território
// =====================================================================
function spot(lat: number | null, lng: number | null, regionText: string | null) {
  if (lat !== null && lng !== null) {
    return { lat, lng, approximate: false, region: nearestRegion(lat, lng)?.name ?? regionText ?? null };
  }
  const region = findRegion(regionText);
  if (region) {
    return { lat: region.lat, lng: region.lng, approximate: true, region: region.name };
  }
  return null;
}

export async function getGovMap(userId: string, role: string | undefined, filters: { layers?: string }) {
  assertGov(role);

  const wanted = new Set(
    (filters.layers ?? "projects,communities,trainings,regions,places,services")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  // Projetos, comunidades, formações e resumo por região vêm do mapa que já existe
  const baseLayers = ["projects", "communities", "trainings", "regions"].filter((l) => wanted.has(l)).join(",");
  const map: any = await getMap(userId, role, { layers: baseLayers, scope: "all" });

  const points: any[] = [...(map.points ?? [])];
  let unplaced: number = map.unplaced ?? 0;

  const needPlaces = wanted.has("places") || wanted.has("regions");
  const needServices = wanted.has("services") || wanted.has("regions");

  const [places, services, reports, alerts] = await Promise.all([
    needPlaces
      ? prisma.govPlace.findMany({
          where: { OR: [{ isPublic: true }, { ownerId: userId }] },
          select: { id: true, ownerId: true, kind: true, subtype: true, name: true, region: true, lat: true, lng: true, status: true },
          take: 1500,
        })
      : Promise.resolve([] as any[]),
    needServices
      ? prisma.publicService.findMany({
          where: { isPublished: true },
          select: { id: true, ownerId: true, name: true, category: true, region: true, address: true, lat: true, lng: true, status: true },
          take: 1500,
        })
      : Promise.resolve([] as any[]),
    wanted.has("regions")
      ? prisma.citizenReport.findMany({
          where: { status: { in: OPEN_REPORT } },
          select: { region: true, priority: true },
          take: 50000,
        })
      : Promise.resolve([] as any[]),
    wanted.has("regions")
      ? prisma.officialAlert.findMany({
          where: { isActive: true, startsAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          select: { regions: true, severity: true },
          take: 500,
        })
      : Promise.resolve([] as any[]),
  ]);

  if (wanted.has("places")) {
    (places as any[]).forEach((p) => {
      const s = spot(p.lat, p.lng, p.region);
      if (!s) {
        unplaced += 1;
        return;
      }
      points.push({
        layer: "places",
        id: p.id,
        name: p.name,
        kind: p.kind,
        subtype: p.subtype,
        status: p.status,
        isMine: p.ownerId === userId,
        ...s,
      });
    });
  }

  if (wanted.has("services")) {
    (services as any[]).forEach((sv) => {
      const s = spot(sv.lat, sv.lng, sv.region ?? sv.address);
      if (!s) {
        unplaced += 1;
        return;
      }
      points.push({
        layer: "services",
        id: sv.id,
        name: sv.name,
        category: sv.category,
        status: sv.status,
        isMine: sv.ownerId === userId,
        ...s,
      });
    });
  }

  // Números extra por região: pedidos em aberto, alertas ativos, locais e serviços
  let regions: any[] = map.regions ?? [];
  if (wanted.has("regions")) {
    const extra = new Map<string, any>();
    REGIONS.forEach((r) =>
      extra.set(r.key, {
        reports: { open: 0, urgent: 0 },
        alerts: { active: 0, maxSeverity: null as string | null },
        places: { infrastructures: 0, markets: 0, zones: 0, damaged: 0 },
        services: 0,
      })
    );

    (reports as any[]).forEach((r) => {
      const key = findRegion(r.region)?.key;
      if (!key) return;
      const e = extra.get(key);
      e.reports.open += 1;
      if (r.priority === "URGENTE") e.reports.urgent += 1;
    });

    (alerts as any[]).forEach((a) => {
      const keys: string[] = a.regions.length === 0 ? REGIONS.map((r) => r.key) : a.regions;
      keys.forEach((key) => {
        const e = extra.get(key);
        if (!e) return;
        e.alerts.active += 1;
        if (!e.alerts.maxSeverity || (SEVERITY_RANK[a.severity] ?? 0) > (SEVERITY_RANK[e.alerts.maxSeverity] ?? 0)) {
          e.alerts.maxSeverity = a.severity;
        }
      });
    });

    (places as any[]).forEach((p) => {
      const key = findRegion(p.region)?.key ?? (p.lat !== null && p.lng !== null ? nearestRegion(p.lat, p.lng)?.key : null);
      if (!key) return;
      const e = extra.get(key);
      if (p.kind === "INFRAESTRUTURA") e.places.infrastructures += 1;
      else if (p.kind === "MERCADO") e.places.markets += 1;
      else e.places.zones += 1;
      if (p.status === "DANIFICADA") e.places.damaged += 1;
    });

    (services as any[]).forEach((sv) => {
      const key = findRegion(sv.region ?? sv.address)?.key ?? (sv.lat !== null && sv.lng !== null ? nearestRegion(sv.lat, sv.lng)?.key : null);
      if (key) extra.get(key).services += 1;
    });

    regions = regions.map((r) => ({ ...r, ...(extra.get(r.key) ?? {}) }));
  }

  return {
    bounds: map.bounds,
    points,
    unplaced,
    regions,
    unmatched: map.unmatched,
    note:
      "Pontos sem coordenadas aparecem no centro da região. Os números de agricultores, pescadores, artesãos e cooperativas são totais por região e não mostram dados pessoais. Os pedidos dos cidadãos aparecem só como números por região.",
  };
}
