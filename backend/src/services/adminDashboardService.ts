import { prisma } from "../lib/prisma";
import { stageOf } from "../lib/agentOpsCatalog";
import { deliveryPhase } from "../lib/transportCatalog";
import { BUYER_ROLES } from "../lib/adminUserCatalog";
import { getSetting } from "../lib/platformSettings";
import { safe } from "../lib/agentScope";
import { AdminSnapshot } from "./adminAccess";

const DAY = 86400000;
const CORE_CACHE_MS = 60000;
const FINAL_STAGES = ["CONCLUIDA", "CANCELADA", "ENTREGUE"];
const LEVEL_ORDER: Record<string, number> = { ALTA: 0, MEDIA: 1, INFO: 2 };

const KIND_OF: Record<string, string> = {
  AGRICULTOR: "farmers",
  PESCADOR: "fishers",
  ARTESAO: "artisans",
  TRANSPORTADOR: "transporters",
  COMERCIANTE: "merchants",
  ONG: "ngos",
  GOVERNO: "institutions",
  AGENTE: "agents",
  ADMIN: "admins",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

let coreCache: { at: number; value: any } | null = null;

// Os números gerais mudam devagar: guardam-se por 1 minuto para o painel abrir depressa
async function computeCore() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const d7 = new Date(now.getTime() - 7 * DAY);
  const d14 = startOfDay(new Date(now.getTime() - 13 * DAY));
  const d30 = new Date(now.getTime() - 30 * DAY);
  const stuckDays = await getSetting<number>("delivery.stuckDays");
  const stuckCutoff = new Date(now.getTime() - stuckDays * DAY);

  const [
    roleGroups,
    new7,
    new30,
    inactive,
    productsAvailable,
    productsTotal,
    products7,
    orderGroups,
    orderGroups30,
    ordersToday,
    stuckRows,
    deliveries,
    problems7,
    ngoProjects,
    govPrograms,
    alertRows,
    trendUsers,
    trendOrders,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { isActive: true }, _count: { _all: true } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.product.count({ where: { isAvailable: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { createdAt: { gte: d7 } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, _sum: { total: true } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: d30 } }, _count: { _all: true }, _sum: { total: true } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.findMany({ where: { updatedAt: { lt: stuckCutoff } }, select: { status: true }, take: 5000 }),
    prisma.delivery.findMany({ select: { id: true, status: true, transporterId: true }, take: 20000 }),
    prisma.deliveryEvent.count({ where: { kind: "PROBLEMA", createdAt: { gte: d7 } } }),
    prisma.ngoProject.count(),
    prisma.govProgram.count(),
    prisma.officialAlert.findMany({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true, title: true, severity: true, kind: true },
      orderBy: { startsAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({ where: { createdAt: { gte: d14 } }, select: { createdAt: true }, take: 5000 }),
    prisma.order.findMany({ where: { createdAt: { gte: d14 } }, select: { createdAt: true, status: true, total: true }, take: 5000 }),
  ]);

  // Utilizadores por tipo
  const byKind: Record<string, number> = {
    farmers: 0,
    fishers: 0,
    artisans: 0,
    transporters: 0,
    merchants: 0,
    buyers: 0,
    ngos: 0,
    institutions: 0,
    agents: 0,
    admins: 0,
  };
  let active = 0;
  roleGroups.forEach((g) => {
    const n = g._count._all;
    active += n;
    const role = String(g.role);
    if (KIND_OF[role]) byKind[KIND_OF[role]] += n;
    else if (BUYER_ROLES.includes(role)) byKind.buyers += n;
  });

  // Encomendas por etapa e valor vendido
  const byStage: Record<string, number> = {};
  let total = 0;
  let valueTotal = 0;
  orderGroups.forEach((g) => {
    const stage = stageOf(g.status);
    byStage[stage] = (byStage[stage] ?? 0) + g._count._all;
    total += g._count._all;
    if (stage === "CONCLUIDA" || stage === "ENTREGUE") valueTotal += Number(g._sum.total ?? 0);
  });
  let value30 = 0;
  let orders30 = 0;
  orderGroups30.forEach((g) => {
    orders30 += g._count._all;
    const stage = stageOf(g.status);
    if (stage === "CONCLUIDA" || stage === "ENTREGUE") value30 += Number(g._sum.total ?? 0);
  });
  const open = Object.keys(byStage)
    .filter((s) => !FINAL_STAGES.includes(s))
    .reduce((sum, s) => sum + byStage[s], 0);
  const stuck = stuckRows.filter((o) => !FINAL_STAGES.includes(stageOf(o.status))).length;

  // Transportes
  const phases: Record<string, number> = {};
  (deliveries as any[]).forEach((d) => {
    const phase = deliveryPhase(d);
    phases[phase] = (phases[phase] ?? 0) + 1;
  });

  // Evolução dos últimos 14 dias
  const trend: { date: string; users: number; orders: number; sales: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dateKey(new Date(now.getTime() - i * DAY));
    const dayOrders = trendOrders.filter((o) => dateKey(new Date(o.createdAt)) === key);
    trend.push({
      date: key,
      users: trendUsers.filter((u) => dateKey(new Date(u.createdAt)) === key).length,
      orders: dayOrders.length,
      sales: Math.round(
        dayOrders.filter((o) => ["CONCLUIDA", "ENTREGUE"].includes(stageOf(o.status))).reduce((s, o) => s + Number(o.total ?? 0), 0)
      ),
    });
  }

  return {
    generatedAt: now,
    users: { active, inactive, total: active + inactive, new7, new30, byKind },
    market: { available: productsAvailable, total: productsTotal, new7: products7 },
    orders: { total, today: ordersToday, open, completed: (byStage.CONCLUIDA ?? 0) + (byStage.ENTREGUE ?? 0), cancelled: byStage.CANCELADA ?? 0, stuck, last30: orders30, value30: Math.round(value30), valueTotal: Math.round(valueTotal), byStage },
    transport: {
      awaiting: phases.DISPONIVEL ?? 0,
      accepted: phases.ACEITE ?? 0,
      inTransit: phases.EM_TRANSPORTE ?? 0,
      delivered: phases.ENTREGUE ?? 0,
      problems7,
    },
    projects: { ngo: ngoProjects, government: govPrograms },
    alerts: { active: alertRows.length, items: alertRows.slice(0, 3) },
    trend,
  };
}

export async function getDashboard(admin: AdminSnapshot) {
  if (!coreCache || Date.now() - coreCache.at > CORE_CACHE_MS) {
    coreCache = { at: Date.now(), value: await computeCore() };
  }
  const core = coreCache.value;
  const d7 = new Date(Date.now() - 7 * DAY);

  const [identity, transporters, agents, agentCases, agentSecurity, reportsOpen, reportsAnalysis, securityAlerts] = await Promise.all([
    prisma.identityVerification.count({ where: { status: "PENDENTE" } }),
    prisma.transporterProfile.count({ where: { verificationStatus: "PENDENTE" } }),
    prisma.agentProfile.count({ where: { status: "PENDENTE" } }),
    prisma.agentCase.count({ where: { status: "ESCALADO" } }),
    prisma.agentSecurityReport.count({ where: { status: "ABERTO" } }),
    prisma.contentReport.count({ where: { status: "ABERTA" } }),
    prisma.contentReport.count({ where: { status: "EM_ANALISE" } }),
    safe("alertas de segurança", () => prisma.adminSecurityEvent.count({ where: { severity: "ALERTA", createdAt: { gte: d7 } } }), 0),
  ]);

  const attention: { key: string; level: string; title: string; detail: string; perm: string; target: { screen: string } }[] = [];
  const add = (key: string, count: number, level: string, title: string, detail: string, perm: string, screen: string) => {
    if (count > 0) attention.push({ key, level, title: `${count} ${title}`, detail, perm, target: { screen } });
  };

  add("reports", reportsOpen, "ALTA", reportsOpen === 1 ? "denúncia por analisar" : "denúncias por analisar", "Pessoas que denunciaram produtos, contas ou fraudes.", "reports.view", "AdminReports");
  add("stuck", core.orders.stuck, "MEDIA", core.orders.stuck === 1 ? "encomenda parada" : "encomendas paradas", "Sem andamento há vários dias.", "orders.view", "AdminOrders");
  add("identity", identity, "MEDIA", identity === 1 ? "pedido de verificação de identidade" : "pedidos de verificação de identidade", "Pessoas à espera do selo de verificado.", "users.verify", "AdminIdentity");
  add("transporters", transporters, "MEDIA", transporters === 1 ? "transportador para verificar" : "transportadores para verificar", "Documentos à espera de análise.", "transport.manage", "AdminTransporters");
  add("agents", agents, "MEDIA", agents === 1 ? "agente para aprovar" : "agentes para aprovar", "Perfis de agente à espera de aprovação.", "users.manage", "AdminAgents");
  add("agentCases", agentCases, "MEDIA", agentCases === 1 ? "chamado de agente com a equipa" : "chamados de agentes com a equipa", "Os agentes pediram ajuda da equipa.", "support.reply", "AdminAgentCases");
  add("agentSecurity", agentSecurity, "ALTA", agentSecurity === 1 ? "denúncia de segurança sobre agentes" : "denúncias de segurança sobre agentes", "Atividade suspeita comunicada.", "users.manage", "AdminAgentSecurity");
  add("security", securityAlerts, "ALTA", securityAlerts === 1 ? "alerta de segurança (7 dias)" : "alertas de segurança (7 dias)", "Acessos bloqueados e dispositivos novos.", "security.view", "AdminSecurity");

  return {
    ...core,
    reports: { open: reportsOpen, inAnalysis: reportsAnalysis },
    attention: attention.filter((a) => admin.permissions.has(a.perm)).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]),
  };
}
