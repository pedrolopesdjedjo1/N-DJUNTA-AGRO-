import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import { REPORT_CATEGORIES, REPORT_STATUS } from "../lib/govCatalog";
import { values } from "../lib/ngoCatalog";
import { orgInfo } from "../lib/ngoOrgInfo";
import { assertGov } from "./organizationService";
import { listOrganizations } from "./ngoDirectoryService";

const CATEGORY_VALUES = values(REPORT_CATEGORIES);
const STATUS_VALUES = values(REPORT_STATUS);
const OPEN_STATUSES = ["RECEBIDO", "EM_ANALISE", "ENCAMINHADO"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_OPEN_PER_USER = 10;
const MAX_PER_DAY = 5;
const MAX_IMAGES = 4;

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

function categoryLabel(value: string) {
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

async function makeProtocol(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt++) {
    let suffix = "";
    randomBytes(6).forEach((b) => {
      suffix += CODE_ALPHABET[b % CODE_ALPHABET.length];
    });
    const protocol = `PRO-${year}-${suffix}`;
    const exists = await prisma.citizenReport.findUnique({ where: { protocol } });
    if (!exists) return protocol;
  }
  throw new Error("Não foi possível gerar o número de protocolo. Tente de novo.");
}

async function notify(userId: string, title: string, message: string, relatedId: string) {
  await prisma.notification.create({ data: { userId, type: "SISTEMA", title, message, relatedId } });
}

async function addEvent(
  reportId: string,
  authorId: string,
  kind: string,
  extra: { status?: string; message?: string | null; isInternal?: boolean } = {}
) {
  await prisma.citizenReportEvent.create({
    data: {
      reportId,
      authorId,
      kind,
      status: extra.status ?? null,
      message: extra.message ?? null,
      isInternal: extra.isInternal ?? false,
    },
  });
}

// =====================================================================
// Quem envia (qualquer pessoa)
// =====================================================================
export async function createReport(userId: string, input: any) {
  const category = String(input?.category ?? "");
  if (!CATEGORY_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de pedido ou de denúncia.");
  }

  const title = clean(input?.title, 120);
  if (!title || title.length < 3) {
    throw new Error("Escreva um título curto.");
  }
  const message = clean(input?.message, 2000);
  if (!message || message.length < 10) {
    throw new Error("Explique melhor o que se passa (pelo menos 10 letras).");
  }

  const anonymous = Boolean(input?.anonymous);
  if (anonymous && category === "PEDIDO_APOIO") {
    throw new Error("Um pedido de apoio não pode ser anónimo, porque a instituição precisa de o contactar.");
  }

  const [open, today, user] = await Promise.all([
    prisma.citizenReport.count({ where: { requesterId: userId, status: { in: OPEN_STATUSES } } }),
    prisma.citizenReport.count({ where: { requesterId: userId, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { location: true } }),
  ]);
  if (open >= MAX_OPEN_PER_USER) {
    throw new Error(`Já tem ${MAX_OPEN_PER_USER} pedidos em aberto. Espere pelas respostas.`);
  }
  if (today >= MAX_PER_DAY) {
    throw new Error("Já enviou vários pedidos hoje. Tente amanhã.");
  }

  let institutionId: string | null = null;
  if (input?.institutionId) {
    const id = String(input.institutionId);
    if (id === userId) {
      throw new Error("Não pode enviar um pedido a si próprio.");
    }
    const [inst, org] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } }),
      prisma.organization.findUnique({ where: { ownerId: id }, select: { id: true } }),
    ]);
    if (!inst || !inst.isActive || String(inst.role) !== "GOVERNO" || !org) {
      throw new Error("Instituição não encontrada.");
    }
    institutionId = id;
  }

  let placeId: string | null = null;
  if (input?.placeId) {
    const place = await prisma.govPlace.findUnique({ where: { id: String(input.placeId) } });
    if (!place || !place.isPublic) {
      throw new Error("Local não encontrado.");
    }
    placeId = place.id;
  }

  const imageUrls = Array.isArray(input?.imageUrls) ? input.imageUrls : [];
  if (!imageUrls.every(validStorageUrl)) {
    throw new Error("Foto inválida. Envie as fotos pelo app.");
  }

  let lat: number | null = null;
  let lng: number | null = null;
  const has = (v: any) => v !== undefined && v !== null && v !== "";
  if (has(input?.lat) || has(input?.lng)) {
    lat = Number(input.lat);
    lng = Number(input.lng);
    if (!has(input.lat) || !has(input.lng) || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Coordenadas inválidas.");
    }
  }

  const protocol = await makeProtocol();
  const created = await prisma.citizenReport.create({
    data: {
      protocol,
      requesterId: userId,
      institutionId,
      category,
      title,
      message,
      region: clean(input?.region, 80) ?? user?.location ?? null,
      location: clean(input?.location, 150),
      lat,
      lng,
      placeId,
      imageUrls: imageUrls.slice(0, MAX_IMAGES),
      anonymous,
    },
  });

  await addEvent(created.id, userId, "CRIADO", { status: "RECEBIDO" });

  if (institutionId) {
    await notify(
      institutionId,
      category === "DENUNCIA" ? "Nova denúncia" : "Novo pedido de cidadão",
      `${categoryLabel(category)}: ${title}`,
      created.id
    );
  }

  return { id: created.id, protocol, status: created.status, anonymous, institutionId };
}

async function eventsOf(report: any, forInstitution: boolean) {
  const rows = await prisma.citizenReportEvent.findMany({
    where: { reportId: report.id, ...(forInstitution ? {} : { isInternal: false }) },
    orderBy: { createdAt: "asc" },
  });

  const institutionIds = Array.from(new Set(rows.map((e) => e.authorId).filter((id) => id !== report.requesterId)));
  const orgs = await orgInfo(institutionIds);
  const requester = forInstitution && !report.anonymous
    ? await prisma.user.findUnique({ where: { id: report.requesterId }, select: { name: true } })
    : null;

  return rows.map((e) => {
    const citizen = e.authorId === report.requesterId;
    return {
      id: e.id,
      kind: e.kind,
      status: e.status,
      message: e.message,
      isInternal: e.isInternal,
      createdAt: e.createdAt,
      authorKind: citizen ? "CITIZEN" : "INSTITUTION",
      authorName: citizen
        ? forInstitution
          ? report.anonymous
            ? "Cidadão anónimo"
            : requester?.name ?? "Cidadão"
          : "Você"
        : orgs.get(e.authorId)?.name ?? "Instituição",
    };
  });
}

export async function myReports(userId: string) {
  const rows = await prisma.citizenReport.findMany({
    where: { requesterId: userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const orgs = await orgInfo(rows.map((r) => r.institutionId).filter(Boolean) as string[]);

  return rows.map((r) => ({
    id: r.id,
    protocol: r.protocol,
    category: r.category,
    title: r.title,
    region: r.region,
    status: r.status,
    anonymous: r.anonymous,
    answer: r.answer,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    institution: r.institutionId ? orgs.get(r.institutionId)?.name ?? "Instituição" : null,
  }));
}

export async function getMyReport(userId: string, id: string) {
  const report = await prisma.citizenReport.findUnique({ where: { id } });
  if (!report || report.requesterId !== userId) {
    throw new Error("Pedido não encontrado.");
  }

  const [events, orgs, place] = await Promise.all([
    eventsOf(report, false),
    orgInfo(report.institutionId ? [report.institutionId] : []),
    report.placeId ? prisma.govPlace.findUnique({ where: { id: report.placeId }, select: { id: true, name: true, kind: true } }) : null,
  ]);

  return {
    report: {
      ...report,
      institution: report.institutionId
        ? { id: report.institutionId, name: orgs.get(report.institutionId)?.name ?? "Instituição" }
        : null,
      place,
    },
    events,
    canComment: OPEN_STATUSES.includes(report.status),
    canDelete: report.status === "RECEBIDO",
  };
}

export async function addCitizenComment(userId: string, id: string, messageInput: any) {
  const report = await prisma.citizenReport.findUnique({ where: { id } });
  if (!report || report.requesterId !== userId) {
    throw new Error("Pedido não encontrado.");
  }
  if (!OPEN_STATUSES.includes(report.status)) {
    throw new Error("Este pedido já está encerrado. Envie um novo pedido, se for preciso.");
  }

  const message = clean(messageInput, 1000);
  if (!message || message.length < 3) {
    throw new Error("Escreva a informação que quer juntar.");
  }

  await addEvent(id, userId, "CIDADAO", { message });
  await prisma.citizenReport.update({ where: { id }, data: { updatedAt: new Date() } });

  if (report.institutionId) {
    await notify(report.institutionId, "Nova informação num pedido", `${report.protocol}: ${report.title}`, id);
  }

  return getMyReport(userId, id);
}

export async function deleteMyReport(userId: string, id: string) {
  const report = await prisma.citizenReport.findUnique({ where: { id } });
  if (!report || report.requesterId !== userId) {
    throw new Error("Pedido não encontrado.");
  }
  if (report.status !== "RECEBIDO") {
    throw new Error("Só pode apagar um pedido que ainda ninguém analisou.");
  }

  await prisma.citizenReport.delete({ where: { id } });
  return { id, deleted: true };
}

// Acompanhar pelo número de protocolo: só mostra o estado e as respostas da instituição
export async function trackProtocol(protocolInput: string) {
  const protocol = String(protocolInput ?? "").trim().toUpperCase();
  const report = protocol ? await prisma.citizenReport.findUnique({ where: { protocol } }) : null;
  if (!report) {
    throw new Error("Protocolo não encontrado. Confira o número.");
  }

  const [events, orgs] = await Promise.all([
    prisma.citizenReportEvent.findMany({
      where: { reportId: report.id, isInternal: false, NOT: { kind: "CIDADAO" } },
      orderBy: { createdAt: "asc" },
    }),
    orgInfo(report.institutionId ? [report.institutionId] : []),
  ]);

  return {
    protocol: report.protocol,
    category: report.category,
    region: report.region,
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    institution: report.institutionId ? orgs.get(report.institutionId)?.name ?? "Instituição" : null,
    answer: report.answer,
    events: events.map((e) => ({
      kind: e.kind,
      status: e.status,
      message: e.kind === "CRIADO" ? null : e.message,
      createdAt: e.createdAt,
    })),
  };
}

// =====================================================================
// Instituições públicas
// =====================================================================
async function requestersOf(rows: any[]) {
  const ids = Array.from(new Set(rows.filter((r) => !r.anonymous).map((r) => r.requesterId)));
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true },
      })
    : [];
  return new Map(users.map((u) => [u.id, u]));
}

export async function listReports(
  userId: string,
  role: string | undefined,
  filters: { scope?: string; status?: string; category?: string; region?: string; priority?: string; q?: string }
) {
  assertGov(role);

  const mine = { institutionId: userId };
  const open = { institutionId: null, status: "RECEBIDO" };
  const where: any = filters.scope === "open" ? { ...open } : { ...mine };

  if (filters.scope !== "open" && filters.status && STATUS_VALUES.includes(filters.status)) where.status = filters.status;
  if (filters.category && CATEGORY_VALUES.includes(filters.category)) where.category = filters.category;
  if (filters.priority === "URGENTE") where.priority = "URGENTE";
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.q) {
    where.AND = [
      {
        OR: [
          { title: { contains: filters.q, mode: "insensitive" } },
          { message: { contains: filters.q, mode: "insensitive" } },
          { protocol: { contains: filters.q.toUpperCase() } },
        ],
      },
    ];
  }

  const [rows, newMine, openCount, urgent, groups] = await Promise.all([
    prisma.citizenReport.findMany({ where, orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.citizenReport.count({ where: { institutionId: userId, status: "RECEBIDO" } }),
    prisma.citizenReport.count({ where: open }),
    prisma.citizenReport.count({ where: { institutionId: userId, priority: "URGENTE", status: { in: OPEN_STATUSES } } }),
    prisma.citizenReport.groupBy({ by: ["status"], where: mine, _count: { _all: true } }),
  ]);

  const requesters = await requestersOf(rows);
  const byStatus: Record<string, number> = {};
  groups.forEach((g) => (byStatus[g.status] = g._count._all));

  const items = rows
    .map((r) => ({
      id: r.id,
      protocol: r.protocol,
      category: r.category,
      title: r.title,
      region: r.region,
      status: r.status,
      priority: r.priority,
      anonymous: r.anonymous,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      imagesCount: r.imageUrls.length,
      isOpenRequest: r.institutionId === null,
      requesterName: r.anonymous ? null : requesters.get(r.requesterId)?.name ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.priority === "URGENTE") - Number(a.priority === "URGENTE") ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return { counts: { newMine, open: openCount, urgent, byStatus }, items };
}

async function loadForInstitution(userId: string, role: string | undefined, id: string) {
  assertGov(role);
  const report = await prisma.citizenReport.findUnique({ where: { id } });
  if (!report) {
    throw new Error("Pedido não encontrado.");
  }

  const mine = report.institutionId === userId;
  const open = report.institutionId === null;
  if (!mine && !open && role !== "ADMIN") {
    throw new Error("Pedido não encontrado.");
  }
  return { report, mine, open };
}

export async function getReportForInstitution(userId: string, role: string | undefined, id: string) {
  const { report, mine, open } = await loadForInstitution(userId, role, id);

  const [events, requesters, place, institutions] = await Promise.all([
    eventsOf(report, true),
    requestersOf([report]),
    report.placeId ? prisma.govPlace.findUnique({ where: { id: report.placeId }, select: { id: true, name: true, kind: true, status: true } }) : null,
    mine ? listOrganizations({ kind: "GOVERNO" }) : Promise.resolve([] as any[]),
  ]);

  return {
    report: {
      ...report,
      requesterId: undefined,
      requester: report.anonymous ? null : requesters.get(report.requesterId) ?? null,
      place,
      isOpenRequest: open,
    },
    events,
    canAct: mine || open || role === "ADMIN",
    institutions: (institutions as any[]).filter((i) => i.ownerId !== userId),
  };
}

export async function setReportStatus(userId: string, role: string | undefined, id: string, input: any) {
  const { report, open } = await loadForInstitution(userId, role, id);

  const status = String(input?.status ?? "");
  if (!["EM_ANALISE", "RESOLVIDO", "REJEITADO"].includes(status)) {
    throw new Error("Estado inválido.");
  }
  if (open && status !== "EM_ANALISE") {
    throw new Error("Assuma primeiro o pedido (em análise) para o poder resolver ou recusar.");
  }
  if (["RESOLVIDO", "REJEITADO"].includes(report.status) && status !== "EM_ANALISE") {
    throw new Error("Este pedido já está encerrado. Reabra-o (em análise) para o mudar.");
  }

  const answer = clean(input?.answer, 1500);
  if (status === "REJEITADO" && (!answer || answer.length < 3)) {
    throw new Error("Explique o motivo, para a pessoa perceber.");
  }

  const closed = status === "RESOLVIDO" || status === "REJEITADO";
  await prisma.citizenReport.update({
    where: { id },
    data: {
      status,
      institutionId: report.institutionId ?? userId,
      handledById: userId,
      answer: answer ?? report.answer,
      resolvedAt: closed ? new Date() : null,
    },
  });
  await addEvent(id, userId, "ESTADO", { status, message: answer });

  const org = await orgInfo([userId]);
  const name = org.get(userId)?.name ?? "A instituição";
  const titles: Record<string, string> = {
    EM_ANALISE: "O seu pedido está em análise",
    RESOLVIDO: "O seu pedido foi resolvido",
    REJEITADO: "O seu pedido não foi aceite",
  };
  await notify(report.requesterId, titles[status], `${report.protocol} · ${name}${answer ? `: ${answer}` : ""}`, id);

  return getReportForInstitution(userId, role, id);
}

export async function respondToReport(userId: string, role: string | undefined, id: string, messageInput: any) {
  const { report, mine } = await loadForInstitution(userId, role, id);
  if (!mine && role !== "ADMIN") {
    throw new Error("Assuma primeiro o pedido para poder responder.");
  }

  const message = clean(messageInput, 1500);
  if (!message || message.length < 3) {
    throw new Error("Escreva a resposta.");
  }

  await prisma.citizenReport.update({ where: { id }, data: { answer: message, handledById: userId } });
  await addEvent(id, userId, "RESPOSTA", { message });

  const org = await orgInfo([userId]);
  await notify(
    report.requesterId,
    "Recebeu uma resposta ao seu pedido",
    `${report.protocol} · ${org.get(userId)?.name ?? "A instituição"}: ${message}`,
    id
  );

  return getReportForInstitution(userId, role, id);
}

export async function addInternalNote(userId: string, role: string | undefined, id: string, messageInput: any) {
  const { mine } = await loadForInstitution(userId, role, id);
  if (!mine && role !== "ADMIN") {
    throw new Error("Assuma primeiro o pedido para juntar notas.");
  }

  const message = clean(messageInput, 1000);
  if (!message || message.length < 3) {
    throw new Error("Escreva a nota.");
  }

  await addEvent(id, userId, "NOTA_INTERNA", { message, isInternal: true });
  return getReportForInstitution(userId, role, id);
}

export async function setReportPriority(userId: string, role: string | undefined, id: string, priority: any) {
  const { mine } = await loadForInstitution(userId, role, id);
  if (!mine && role !== "ADMIN") {
    throw new Error("Assuma primeiro o pedido para mudar a prioridade.");
  }
  if (priority !== "NORMAL" && priority !== "URGENTE") {
    throw new Error("Prioridade inválida.");
  }

  await prisma.citizenReport.update({ where: { id }, data: { priority } });
  await addEvent(id, userId, "PRIORIDADE", {
    message: priority === "URGENTE" ? "Marcado como urgente." : "Prioridade normal.",
    isInternal: true,
  });
  return getReportForInstitution(userId, role, id);
}

export async function forwardReport(userId: string, role: string | undefined, id: string, input: any) {
  const { report, mine } = await loadForInstitution(userId, role, id);
  if (!mine && role !== "ADMIN") {
    throw new Error("Assuma primeiro o pedido para o poder encaminhar.");
  }
  if (["RESOLVIDO", "REJEITADO"].includes(report.status)) {
    throw new Error("Este pedido já está encerrado.");
  }

  const targetId = String(input?.institutionId ?? "");
  if (!targetId || targetId === userId) {
    throw new Error("Escolha a instituição para onde encaminhar.");
  }

  const [target, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetId }, select: { role: true, isActive: true } }),
    prisma.organization.findUnique({ where: { ownerId: targetId }, select: { name: true } }),
  ]);
  if (!target || !target.isActive || String(target.role) !== "GOVERNO" || !org) {
    throw new Error("Instituição não encontrada.");
  }

  const note = clean(input?.message, 500);
  const from = (await orgInfo([userId])).get(userId)?.name ?? "outra instituição";

  await prisma.citizenReport.update({
    where: { id },
    data: { institutionId: targetId, status: "ENCAMINHADO", handledById: userId, resolvedAt: null },
  });
  await addEvent(id, userId, "ENCAMINHADO", { status: "ENCAMINHADO", message: `Encaminhado para ${org.name}${note ? `: ${note}` : ""}` });

  await notify(targetId, "Pedido encaminhado para si", `${report.protocol}: ${report.title} (de ${from})`, id);
  await notify(report.requesterId, "O seu pedido foi encaminhado", `${report.protocol} segue agora com ${org.name}.`, id);

  return getReportForInstitution(userId, role, id);
}
