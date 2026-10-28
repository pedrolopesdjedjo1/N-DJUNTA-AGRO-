import { prisma } from "../lib/prisma";
import { clean, plain, safe } from "../lib/agentScope";
import { CONTENT_KINDS } from "../lib/adminFinanceCatalog";
import { values } from "../lib/ngoCatalog";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";
import { applySanction, reactivateUser } from "./adminSanctionService";

const PAGE_SIZE = 25;
const DAY = 86400000;
const KIND_VALUES = values(CONTENT_KINDS);

// A qual conta pertence uma linha (os nomes dos campos variam conforme o tipo de conteúdo)
function ownerKey(row: any): string {
  return String(row?.ownerId ?? row?.userId ?? row?.authorId ?? row?.organizationId ?? "");
}

function countBy(rows: any[]): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const key = ownerKey(r);
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}

function orgStatus(o: any | null | undefined): string {
  if (!o) return "SEM_PERFIL";
  return String(o.verificationStatus ?? o.status ?? (o.isVerified ? "APROVADO" : "PENDENTE")).toUpperCase();
}

function asShape(row: any, hidden: Set<string>, extra: Record<string, any> = {}) {
  return {
    id: row.id,
    title: row.title ?? row.name ?? "Sem título",
    type: row.type ?? row.kind ?? null,
    status: row.status ? String(row.status) : null,
    createdAt: row.createdAt ?? null,
    hidden: hidden.has(row.id),
    ...extra,
  };
}

async function hiddenSet(kind: string): Promise<Set<string>> {
  const rows = await prisma.contentVisibility.findMany({ where: { kind, hidden: true }, select: { refId: true } });
  return new Set(rows.map((r) => r.refId));
}

async function sanctionOf(ids: string[]) {
  const rows = ids.length ? await prisma.userSanction.findMany({ where: { userId: { in: ids }, status: "ATIVA" } }) : [];
  return new Map(rows.map((s) => [s.userId, { kind: s.kind, reason: s.reason, endsAt: s.endsAt }]));
}

// =====================================================================
// Organizações (ONGs e instituições do governo)
// =====================================================================
export async function listOrganizations(filters: { kind?: string; status?: string; q?: string; page?: number }) {
  const role = filters.kind === "GOV" ? "GOVERNO" : "ONG";
  const users = await prisma.user.findMany({
    where: { role: role as any },
    select: { id: true, name: true, phone: true, location: true, photoUrl: true, isVerified: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const ids = users.map((u) => u.id);

  const [orgs, projects, publications, opportunities, documents, sanctions] = await Promise.all([
    ids.length ? (prisma.organization.findMany({ where: { ownerId: { in: ids } } }) as Promise<any[]>) : Promise.resolve([] as any[]),
    safe("projetos", async () => (await prisma.ngoProject.findMany({ take: 3000 })) as any[], [] as any[]),
    safe("publicações", async () => (await prisma.publication.findMany({ take: 3000 })) as any[], [] as any[]),
    safe("oportunidades", async () => (await prisma.opportunity.findMany({ take: 3000 })) as any[], [] as any[]),
    safe("documentos", async () => (await prisma.organizationDocument.findMany({ take: 5000 })) as any[], [] as any[]),
    sanctionOf(ids),
  ]);

  const orgMap = new Map(orgs.map((o) => [o.ownerId, o]));
  const projectCount = countBy(projects);
  const publicationCount = countBy(publications);
  const opportunityCount = countBy(opportunities);
  const docCount = new Map<string, number>();
  documents.forEach((d) => d.organizationId && docCount.set(d.organizationId, (docCount.get(d.organizationId) ?? 0) + 1));

  const all = users.map((u) => {
    const o = orgMap.get(u.id);
    const sum = (m: Map<string, number>) => (m.get(u.id) ?? 0) + (o ? m.get(o.id) ?? 0 : 0);
    return {
      userId: u.id,
      name: o?.name ?? u.name,
      ownerName: u.name,
      acronym: o?.acronym ?? null,
      phone: u.phone,
      location: u.location,
      photoUrl: u.photoUrl,
      isActive: u.isActive,
      verified: !!(o?.isVerified ?? u.isVerified),
      status: sanctions.get(u.id) ? "SUSPENSO" : orgStatus(o),
      hasProfile: !!o,
      documents: o ? docCount.get(o.id) ?? 0 : 0,
      projects: sum(projectCount),
      publications: sum(publicationCount),
      opportunities: sum(opportunityCount),
      sanction: sanctions.get(u.id) ?? null,
      createdAt: u.createdAt,
    };
  });

  const counts: Record<string, number> = {};
  all.forEach((o) => (counts[o.status] = (counts[o.status] ?? 0) + 1));

  const needle = plain(filters.q);
  let list = all;
  if (filters.status) list = list.filter((o) => o.status === filters.status);
  if (needle) list = list.filter((o) => plain(`${o.name} ${o.ownerName} ${o.acronym} ${o.phone}`).includes(needle));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    kind: filters.kind === "GOV" ? "GOV" : "ONG",
    counts,
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function getOrganization(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, role: true, location: true, photoUrl: true, isVerified: true, isActive: true, createdAt: true },
  });
  if (!user || !["ONG", "GOVERNO"].includes(String(user.role))) {
    throw new Error("Organização não encontrada.");
  }

  const org: any = await prisma.organization.findFirst({ where: { ownerId: userId } });
  const belongs = (row: any) => [userId, org?.id].includes(ownerKey(row));

  const [documents, projects, publications, opportunities, hiddenP, hiddenO, hiddenJ, sanctions, audit] = await Promise.all([
    org ? safe("documentos", async () => ((await prisma.organizationDocument.findMany({ take: 5000 })) as any[]).filter((d) => d.organizationId === org.id), [] as any[]) : Promise.resolve([] as any[]),
    safe("projetos", async () => ((await prisma.ngoProject.findMany({ take: 3000 })) as any[]).filter(belongs), [] as any[]),
    safe("publicações", async () => ((await prisma.publication.findMany({ take: 3000 })) as any[]).filter(belongs), [] as any[]),
    safe("oportunidades", async () => ((await prisma.opportunity.findMany({ take: 3000 })) as any[]).filter(belongs), [] as any[]),
    hiddenSet("PUBLICATION"),
    hiddenSet("OPPORTUNITY"),
    hiddenSet("PROJECT"),
    prisma.userSanction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.adminAudit.findMany({ where: { targetType: "USER", targetId: userId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const adminIds = Array.from(new Set(audit.map((a) => a.adminId)));
  const admins = adminIds.length ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
  const names = new Map(admins.map((a) => [a.id, a.name]));

  const byDate = (a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

  return {
    user,
    organization: org
      ? {
          id: org.id,
          name: org.name,
          acronym: org.acronym ?? null,
          description: org.description ?? null,
          region: org.region ?? null,
          institutionType: org.institutionType ?? null,
          status: orgStatus(org),
          note: org.verificationNote ?? org.statusNote ?? null,
          isVerified: !!org.isVerified,
        }
      : null,
    activeSanction: sanctions.find((s) => s.status === "ATIVA") ?? null,
    sanctions,
    documents: documents.map((d) => ({ id: d.id, kind: d.kind ?? null, name: d.name ?? "Documento", url: d.url ?? null, createdAt: d.createdAt ?? null })),
    projects: projects.sort(byDate).slice(0, 30).map((p) => asShape(p, hiddenJ)),
    publications: publications.sort(byDate).slice(0, 30).map((p) => asShape(p, hiddenP)),
    opportunities: opportunities.sort(byDate).slice(0, 30).map((p) => asShape(p, hiddenO)),
    history: audit.map((a) => ({ ...a, adminName: names.get(a.adminId) ?? "Administrador" })),
    note: "A verificação de documentos e a aprovação da organização fazem-se na tela de verificações que já existe.",
  };
}

// =====================================================================
// Suspender o acesso e avisar
// =====================================================================
export async function suspendOrganization(admin: AdminSnapshot, userId: string, input: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } });
  if (!user || !["ONG", "GOVERNO"].includes(String(user.role))) {
    throw new Error("Organização não encontrada.");
  }

  const permanent = input?.permanent === true;
  let endsAt: Date | null = null;
  if (!permanent) {
    const days = Math.floor(Number(input?.days));
    if (isNaN(days) || days < 1 || days > 365) {
      throw new Error("Indique por quantos dias (de 1 a 365) ou escolha o bloqueio permanente.");
    }
    endsAt = new Date(Date.now() + days * DAY);
  }

  await applySanction(admin.userId, userId, permanent ? "BLOQUEIO" : "SUSPENSAO", input?.reason, endsAt);
  await logAudit(admin.userId, "ORG_SUSPEND", { type: "USER", id: userId }, `${permanent ? "Bloqueou" : "Suspendeu"} o acesso de ${user.name}`);
  return getOrganization(userId);
}

export async function reactivateOrganization(admin: AdminSnapshot, userId: string, input: any) {
  await reactivateUser(admin, userId, input);
  return getOrganization(userId);
}

export async function notifyOrganization(admin: AdminSnapshot, userId: string, messageInput: any) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } });
  if (!user || !["ONG", "GOVERNO"].includes(String(user.role))) {
    throw new Error("Organização não encontrada.");
  }
  const message = clean(messageInput, 300);
  if (!message || message.length < 5) {
    throw new Error("Escreva a mensagem (pelo menos 5 letras).");
  }

  await prisma.notification.create({ data: { userId, type: "SISTEMA", title: "Mensagem da equipa do NÔDJUNTA AGRO", message, relatedId: userId } });
  await logAudit(admin.userId, "ORG_NOTIFY", { type: "USER", id: userId }, `Avisou ${user.name}: ${message}`);
  return { userId, notified: true };
}

// =====================================================================
// Esconder e repor conteúdos (publicações, oportunidades, projetos)
// =====================================================================
async function contentRow(kind: string, id: string): Promise<{ row: any; title: string; ownerUserId: string | null }> {
  const row: any =
    kind === "PUBLICATION" ? await prisma.publication.findUnique({ where: { id } }) : kind === "OPPORTUNITY" ? await prisma.opportunity.findUnique({ where: { id } }) : await prisma.ngoProject.findUnique({ where: { id } });
  if (!row) {
    throw new Error("Conteúdo não encontrado.");
  }

  let owner = String(row.ownerId ?? row.userId ?? row.authorId ?? "");
  if (!owner && row.organizationId) {
    const org: any = await prisma.organization.findUnique({ where: { id: row.organizationId } });
    owner = org?.ownerId ?? "";
  }
  return { row, title: String(row.title ?? row.name ?? "Conteúdo"), ownerUserId: owner || null };
}

export async function setContentHidden(admin: AdminSnapshot, input: any, hidden: boolean) {
  const kind = String(input?.kind ?? "");
  const refId = String(input?.refId ?? "");
  if (!KIND_VALUES.includes(kind) || !refId) {
    throw new Error("Conteúdo inválido.");
  }

  const reason = clean(input?.reason, 300);
  if (!reason || reason.length < 5) {
    throw new Error("Explique o motivo (pelo menos 5 letras). A organização vê esta explicação.");
  }

  const { title, ownerUserId } = await contentRow(kind, refId);
  await prisma.contentVisibility.upsert({
    where: { kind_refId: { kind, refId } },
    create: { kind, refId, hidden, reason, hiddenBy: admin.userId },
    update: { hidden, reason, hiddenBy: admin.userId, updatedAt: new Date() },
  });

  if (ownerUserId) {
    await prisma.notification.create({
      data: {
        userId: ownerUserId,
        type: "SISTEMA",
        title: hidden ? "Um conteúdo seu foi escondido" : "Um conteúdo seu voltou a aparecer",
        message: `"${title}": ${reason}`,
        relatedId: refId,
      },
    });
  }

  const action = hidden ? (kind === "OPPORTUNITY" ? "OPPORTUNITY_CLOSE" : kind === "PUBLICATION" ? "PUBLICATION_HIDE" : "CONTENT_HIDE") : kind === "PUBLICATION" ? "PUBLICATION_RESTORE" : "CONTENT_RESTORE";
  await logAudit(admin.userId, action, { type: kind, id: refId }, `${hidden ? "Escondeu" : "Repôs"} "${title}": ${reason}`);

  return { kind, refId, hidden };
}

// Para as listas do app: o que está escondido
export async function hiddenContent(kind?: string) {
  const rows = await prisma.contentVisibility.findMany({ where: { hidden: true, ...(kind && KIND_VALUES.includes(kind) ? { kind } : {}) }, select: { kind: true, refId: true } });
  return rows;
}
