import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean, plain, safe } from "../lib/agentScope";
import { AdminSnapshot } from "./adminAccess";
import { logAudit } from "./adminAuditService";

const PAGE_SIZE = 25;
const DAY = 86400000;
const COMMUNIQUE_KINDS = ["COMUNICADO", "AVISO", "INFORMACAO"];

function ownerKey(row: any): string {
  return String(row?.ownerId ?? row?.userId ?? row?.authorId ?? row?.organizationId ?? "");
}

function isFinal(status: any): boolean {
  const s = String(status ?? "").toUpperCase();
  return s.includes("RESOLV") || s.includes("CONCLU") || s.includes("ARQUIV") || s.includes("FECH") || s.includes("REJEIT");
}

async function govAccounts() {
  const users = await prisma.user.findMany({ where: { role: "GOVERNO" }, select: { id: true, name: true, location: true, isActive: true, isVerified: true }, take: 500 });
  const orgs: any[] = users.length ? await prisma.organization.findMany({ where: { ownerId: { in: users.map((u) => u.id) } } }) : [];
  const ids = new Set<string>([...users.map((u) => u.id), ...orgs.map((o) => o.id)]);
  const nameOf = new Map<string, string>();
  users.forEach((u) => nameOf.set(u.id, orgs.find((o) => o.ownerId === u.id)?.name ?? u.name));
  orgs.forEach((o) => nameOf.set(o.id, o.name));
  return { users, orgs, ids, nameOf };
}

// =====================================================================
// Visão geral do governo
// =====================================================================
export async function govOverview() {
  const now = new Date();
  const [gov, programs, services, places, alerts, publications, requests] = await Promise.all([
    govAccounts(),
    safe("programas", async () => (await prisma.govProgram.findMany({ take: 2000 })) as any[], [] as any[]),
    prisma.publicService.groupBy({ by: ["isPublished", "status"], _count: { _all: true } }),
    prisma.govPlace.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.officialAlert.count({ where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    safe("publicações", async () => (await prisma.publication.findMany({ take: 3000 })) as any[], [] as any[]),
    safe("pedidos das comunidades", async () => (await prisma.citizenReport.findMany({ orderBy: { createdAt: "desc" }, take: 3000 })) as any[], [] as any[]),
  ]);

  const govPublications = publications.filter((p) => gov.ids.has(ownerKey(p)));
  const open = requests.filter((r) => !isFinal(r.status));
  const stuck = open.filter((r) => now.getTime() - new Date(r.updatedAt ?? r.createdAt).getTime() > 7 * DAY);

  return {
    institutions: {
      total: gov.users.length,
      active: gov.users.filter((u) => u.isActive).length,
      verified: gov.orgs.filter((o) => !!o.isVerified).length,
      withoutProfile: gov.users.filter((u) => !gov.orgs.some((o) => o.ownerId === u.id)).length,
    },
    programs: { total: programs.filter((p) => gov.ids.has(ownerKey(p))).length },
    services: {
      published: services.filter((s) => s.isPublished).reduce((n, s) => n + s._count._all, 0),
      hidden: services.filter((s) => !s.isPublished).reduce((n, s) => n + s._count._all, 0),
    },
    places: places.map((p) => ({ kind: p.kind, count: p._count._all })),
    alerts: { active: alerts },
    publications: {
      total: govPublications.length,
      communiques: govPublications.filter((p) => COMMUNIQUE_KINDS.includes(String(p.type ?? p.kind ?? "").toUpperCase())).length,
    },
    requests: {
      total: requests.length,
      open: open.length,
      stuck: stuck.length,
      last7Days: requests.filter((r) => now.getTime() - new Date(r.createdAt).getTime() <= 7 * DAY).length,
    },
  };
}

// =====================================================================
// Programas
// =====================================================================
export async function listPrograms(filters: { q?: string; page?: number }) {
  const [gov, programs, links] = await Promise.all([
    govAccounts(),
    safe("programas", async () => (await prisma.govProgram.findMany({ orderBy: { createdAt: "desc" }, take: 2000 })) as any[], [] as any[]),
    safe("projetos dos programas", async () => (await prisma.govProgramProject.findMany({ take: 5000 })) as any[], [] as any[]),
  ]);

  const projectCount = new Map<string, number>();
  links.forEach((l) => l.programId && projectCount.set(l.programId, (projectCount.get(l.programId) ?? 0) + 1));

  const needle = plain(filters.q);
  const list = programs
    .filter((p) => !needle || plain(`${p.name} ${p.description}`).includes(needle))
    .map((p) => ({
      id: p.id,
      name: p.name ?? "Programa",
      status: p.status ? String(p.status) : null,
      institution: gov.nameOf.get(ownerKey(p)) ?? "Instituição",
      projects: projectCount.get(p.id) ?? 0,
      createdAt: p.createdAt ?? null,
    }));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return { total: list.length, page, pageSize: PAGE_SIZE, items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

// =====================================================================
// Serviços públicos
// =====================================================================
export async function listServices(filters: { published?: string; q?: string; region?: string; page?: number }) {
  const rows: any[] = await prisma.publicService.findMany({ orderBy: { createdAt: "desc" }, take: 1500 });
  const owners = Array.from(new Set(rows.map((s) => ownerKey(s)).filter(Boolean)));
  const users = owners.length ? await prisma.user.findMany({ where: { id: { in: owners } }, select: { id: true, name: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  const region = filters.region ? REGIONS.find((r) => r.key === filters.region) : null;
  const needle = plain(filters.q);

  let list = rows;
  if (filters.published === "yes") list = list.filter((s) => s.isPublished);
  if (filters.published === "no") list = list.filter((s) => !s.isPublished);
  if (region) list = list.filter((s) => findRegion(s.region ?? s.address)?.key === region.key);
  if (needle) list = list.filter((s) => plain(`${s.name} ${s.address}`).includes(needle));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    summary: { all: rows.length, published: rows.filter((s) => s.isPublished).length, hidden: rows.filter((s) => !s.isPublished).length },
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category ?? null,
      region: s.region ?? null,
      address: s.address ?? null,
      status: s.status ? String(s.status) : null,
      isPublished: !!s.isPublished,
      institution: names.get(ownerKey(s)) ?? null,
      createdAt: s.createdAt ?? null,
    })),
  };
}

export async function setServicePublished(admin: AdminSnapshot, id: string, published: boolean, noteInput: any) {
  const s: any = await prisma.publicService.findUnique({ where: { id } });
  if (!s) {
    throw new Error("Serviço não encontrado.");
  }
  if (!!s.isPublished === published) {
    throw new Error(published ? "Este serviço já está publicado." : "Este serviço já está escondido.");
  }

  const note = clean(noteInput, 300);
  if (!published && (!note || note.length < 5)) {
    throw new Error("Explique porque o serviço é escondido (pelo menos 5 letras).");
  }

  await prisma.publicService.update({ where: { id }, data: { isPublished: published } });

  const owner = ownerKey(s);
  if (owner) {
    await prisma.notification.create({
      data: {
        userId: owner,
        type: "SISTEMA",
        title: published ? "O serviço voltou a aparecer" : "Um serviço seu foi escondido",
        message: `"${s.name}"${note ? `: ${note}` : ""}`,
        relatedId: id,
      },
    });
  }
  await logAudit(admin.userId, "GOV_SERVICE", { type: "SERVICE", id }, `${published ? "Publicou" : "Escondeu"} o serviço "${s.name}"${note ? `: ${note}` : ""}`);

  return { id, isPublished: published };
}

// =====================================================================
// Publicações e comunicados do governo
// =====================================================================
export async function listGovPublications(filters: { kind?: string; q?: string; page?: number }) {
  const [gov, publications, hidden] = await Promise.all([
    govAccounts(),
    safe("publicações", async () => (await prisma.publication.findMany({ orderBy: { createdAt: "desc" }, take: 3000 })) as any[], [] as any[]),
    prisma.contentVisibility.findMany({ where: { kind: "PUBLICATION", hidden: true }, select: { refId: true } }),
  ]);
  const hiddenSet = new Set(hidden.map((h) => h.refId));

  const needle = plain(filters.q);
  let list = publications.filter((p) => gov.ids.has(ownerKey(p)));
  if (filters.kind) list = list.filter((p) => String(p.type ?? p.kind ?? "").toUpperCase() === filters.kind);
  if (needle) list = list.filter((p) => plain(`${p.title} ${p.body ?? p.content ?? ""}`).includes(needle));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => ({
      id: p.id,
      title: p.title ?? "Sem título",
      type: p.type ?? p.kind ?? null,
      institution: gov.nameOf.get(ownerKey(p)) ?? "Instituição",
      createdAt: p.createdAt ?? null,
      hidden: hiddenSet.has(p.id),
    })),
  };
}

// =====================================================================
// Pedidos das comunidades (denúncias e pedidos de apoio ao governo)
// Nunca mostra quem fez um pedido anónimo: a equipa só vê o assunto e o andamento.
// =====================================================================
export async function listCommunityRequests(filters: { status?: string; stuck?: string; region?: string; q?: string; page?: number }) {
  const [rows, gov] = await Promise.all([
    safe("pedidos", async () => (await prisma.citizenReport.findMany({ orderBy: { createdAt: "desc" }, take: 3000 })) as any[], [] as any[]),
    govAccounts(),
  ]);

  const now = Date.now();
  const shaped = rows.map((r) => {
    const updated = new Date(r.updatedAt ?? r.createdAt).getTime();
    const finalState = isFinal(r.status);
    const handlerId = String(r.assignedTo ?? r.assignedInstitutionId ?? r.institutionId ?? "");
    return {
      id: r.id,
      protocol: r.protocol ?? null,
      status: r.status ? String(r.status) : null,
      category: r.category ?? r.kind ?? null,
      description: String(r.description ?? "").slice(0, 300),
      region: findRegion(r.regionKey ?? r.region)?.name ?? r.region ?? null,
      regionKey: findRegion(r.regionKey ?? r.region)?.key ?? null,
      handler: handlerId ? gov.nameOf.get(handlerId) ?? "Instituição" : null,
      handlerId: handlerId || null,
      createdAt: r.createdAt,
      ageDays: Math.floor((now - new Date(r.createdAt).getTime()) / DAY),
      idleDays: Math.floor((now - updated) / DAY),
      final: finalState,
      stuck: !finalState && now - updated > 7 * DAY,
    };
  });

  const byStatus: Record<string, number> = {};
  const byHandler = new Map<string, { name: string; open: number; stuck: number }>();
  shaped.forEach((r) => {
    const key = r.status ?? "—";
    byStatus[key] = (byStatus[key] ?? 0) + 1;
    if (!r.final) {
      const name = r.handler ?? "Sem instituição";
      const h = byHandler.get(name) ?? { name, open: 0, stuck: 0 };
      h.open += 1;
      if (r.stuck) h.stuck += 1;
      byHandler.set(name, h);
    }
  });

  const region = filters.region ? REGIONS.find((r) => r.key === filters.region) : null;
  const needle = plain(filters.q);

  let list = shaped;
  if (filters.status === "OPEN") list = list.filter((r) => !r.final);
  else if (filters.status === "FINAL") list = list.filter((r) => r.final);
  else if (filters.status) list = list.filter((r) => r.status === filters.status);
  if (filters.stuck === "true") list = list.filter((r) => r.stuck);
  if (region) list = list.filter((r) => r.regionKey === region.key);
  if (needle) list = list.filter((r) => plain(`${r.protocol} ${r.description} ${r.category}`).includes(needle));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    summary: { total: shaped.length, open: shaped.filter((r) => !r.final).length, stuck: shaped.filter((r) => r.stuck).length },
    byStatus,
    byHandler: Array.from(byHandler.values()).sort((a, b) => b.stuck - a.stuck || b.open - a.open).slice(0, 15),
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    note: "Quem fez o pedido não aparece aqui, para proteger as pessoas que denunciam em anonimato.",
  };
}
