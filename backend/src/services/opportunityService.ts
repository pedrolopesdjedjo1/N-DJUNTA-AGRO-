import { prisma } from "../lib/prisma";
import { AREAS, OPPORTUNITY_KINDS, values } from "../lib/ngoCatalog";
import { orgInfo } from "../lib/ngoOrgInfo";

const DAY = 86400000;
const KIND_VALUES = values(OPPORTUNITY_KINDS);
const AREA_VALUES = values(AREAS);
const MANAGERS = ["ONG", "ADMIN", "GOVERNO"];
const ANSWERS = ["EM_ANALISE", "ACEITE", "RECUSADA"];
const MAX_OPPORTUNITIES = 200;

function assertManager(role?: string) {
  if (!MANAGERS.includes(role ?? "")) {
    throw new Error("Só organizações e instituições autorizadas podem publicar oportunidades.");
  }
}

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function readPhone(value: any): string | null {
  const phone = clean(value, 20);
  if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
    throw new Error(`Telefone inválido: ${phone}`);
  }
  return phone;
}

function isClosed(o: any): boolean {
  return o.status !== "ABERTA" || (!!o.deadline && new Date(o.deadline).getTime() < Date.now());
}

function readOpportunity(input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.title !== undefined) {
    const title = clean(input?.title, 150);
    if (!title || title.length < 3) {
      throw new Error("Escreva o título da oportunidade.");
    }
    data.title = title;
  }

  if (!existing || input?.kind !== undefined) {
    const kind = String(input?.kind ?? "");
    if (!KIND_VALUES.includes(kind)) {
      throw new Error("Escolha o tipo de oportunidade.");
    }
    data.kind = kind;
  }

  if (!existing || input?.description !== undefined) {
    const description = clean(input?.description, 3000);
    if (!description || description.length < 10) {
      throw new Error("Explique a oportunidade (pelo menos 10 letras).");
    }
    data.description = description;
  }

  if (input?.requirements !== undefined) data.requirements = clean(input.requirements, 1500);
  if (input?.benefits !== undefined) data.benefits = clean(input.benefits, 1000);

  if (input?.area !== undefined) {
    const area = input.area ? String(input.area) : null;
    if (area && !AREA_VALUES.includes(area)) {
      throw new Error("Área inválida.");
    }
    data.area = area;
  }

  if (input?.region !== undefined) data.region = clean(input.region, 80);

  if (input?.amount !== undefined) {
    if (input.amount === null || input.amount === "") {
      data.amount = null;
    } else {
      const amount = Number(String(input.amount).replace(",", "."));
      if (isNaN(amount) || amount < 0 || amount > 1e13) {
        throw new Error("Valor inválido.");
      }
      data.amount = amount;
    }
  }

  if (input?.slots !== undefined) {
    if (input.slots === null || input.slots === "") {
      data.slots = null;
    } else {
      const slots = Math.floor(Number(input.slots));
      if (isNaN(slots) || slots < 1 || slots > 100000) {
        throw new Error("Número de vagas inválido.");
      }
      data.slots = slots;
    }
  }

  if (input?.deadline !== undefined) {
    if (input.deadline === null || input.deadline === "") {
      data.deadline = null;
    } else {
      const deadline = new Date(input.deadline);
      if (isNaN(deadline.getTime())) {
        throw new Error("Data limite inválida.");
      }
      if (deadline.getTime() < Date.now() - DAY) {
        throw new Error("A data limite não pode estar no passado.");
      }
      data.deadline = deadline;
    }
  }

  if (input?.contact !== undefined) data.contact = clean(input.contact, 120);

  if (input?.link !== undefined) {
    const link = clean(input.link, 300);
    if (link && !/^https:\/\/\S+$/i.test(link)) {
      throw new Error("O endereço (link) deve começar por https://");
    }
    data.link = link;
  }

  return data;
}

async function shape(userId: string, items: any[]) {
  const ids = items.map((o) => o.id);

  const [orgs, mine, counts] = await Promise.all([
    orgInfo(items.map((o) => o.ownerId)),
    ids.length
      ? prisma.opportunityApplication.findMany({ where: { opportunityId: { in: ids }, applicantId: userId } })
      : Promise.resolve([] as any[]),
    ids.length
      ? prisma.opportunityApplication.groupBy({
          by: ["opportunityId", "status"],
          where: { opportunityId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  const mineMap = new Map((mine as any[]).map((a) => [a.opportunityId, a]));
  const countMap = new Map<string, { total: number; pending: number; accepted: number }>();
  (counts as any[]).forEach((c) => {
    const row = countMap.get(c.opportunityId) ?? { total: 0, pending: 0, accepted: 0 };
    row.total += c._count._all;
    if (c.status === "ENVIADA" || c.status === "EM_ANALISE") row.pending += c._count._all;
    if (c.status === "ACEITE") row.accepted += c._count._all;
    countMap.set(c.opportunityId, row);
  });

  return items.map((o) => {
    const application = mineMap.get(o.id);
    const own = o.ownerId === userId;
    const row = countMap.get(o.id) ?? { total: 0, pending: 0, accepted: 0 };
    return {
      ...o,
      closed: isClosed(o),
      daysLeft: o.deadline ? Math.ceil((new Date(o.deadline).getTime() - Date.now()) / DAY) : null,
      organization: orgs.get(o.ownerId) ?? null,
      isMine: own,
      applied: !!application,
      myStatus: application?.status ?? null,
      ...(own ? { applicationsCount: row.total, pendingCount: row.pending, acceptedCount: row.accepted } : {}),
    };
  });
}

async function ownOpportunity(userId: string, id: string) {
  const found = await prisma.opportunity.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Oportunidade não encontrada.");
  }
  return found;
}

// ---------- Ver oportunidades (qualquer pessoa) ----------
export async function listOpportunities(
  userId: string,
  filters: { kind?: string; area?: string; region?: string; q?: string; when?: string }
) {
  const where: any = {};
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.area && AREA_VALUES.includes(filters.area)) where.area = filters.area;
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.when === "closed") {
    where.AND = [{ OR: [{ status: { not: "ABERTA" } }, { deadline: { lt: new Date() } }] }];
  } else if (filters.when !== "all") {
    where.status = "ABERTA";
    where.AND = [{ OR: [{ deadline: null }, { deadline: { gte: new Date() } }] }];
  }

  const items = await prisma.opportunity.findMany({
    where,
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
  });
  return shape(userId, items);
}

export async function getOpportunity(userId: string, id: string) {
  const found = await prisma.opportunity.findUnique({ where: { id } });
  if (!found) {
    throw new Error("Oportunidade não encontrada.");
  }

  const [item] = await shape(userId, [found]);
  const application = await prisma.opportunityApplication.findFirst({ where: { opportunityId: id, applicantId: userId } });

  return {
    opportunity: item,
    application: application
      ? { id: application.id, status: application.status, answer: application.answer, createdAt: application.createdAt }
      : null,
  };
}

// ---------- Publicar e gerir (ONG, governo, equipa) ----------
export async function myOpportunities(userId: string, role: string | undefined) {
  assertManager(role);
  const items = await prisma.opportunity.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return shape(userId, items);
}

export async function createOpportunity(userId: string, role: string | undefined, input: any) {
  assertManager(role);

  const count = await prisma.opportunity.count({ where: { ownerId: userId } });
  if (count >= MAX_OPPORTUNITIES) {
    throw new Error(`Pode publicar até ${MAX_OPPORTUNITIES} oportunidades.`);
  }

  const data = readOpportunity(input);
  const created = await prisma.opportunity.create({ data: { ownerId: userId, ...data } });
  const [item] = await shape(userId, [created]);
  return item;
}

export async function updateOpportunity(userId: string, role: string | undefined, id: string, input: any) {
  assertManager(role);
  const found = await ownOpportunity(userId, id);

  const data = readOpportunity(input, found);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.opportunity.update({ where: { id }, data });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function closeOpportunity(userId: string, role: string | undefined, id: string) {
  assertManager(role);
  await ownOpportunity(userId, id);

  const updated = await prisma.opportunity.update({ where: { id }, data: { status: "FECHADA" } });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function reopenOpportunity(userId: string, role: string | undefined, id: string) {
  assertManager(role);
  const found = await ownOpportunity(userId, id);

  if (found.deadline && new Date(found.deadline).getTime() < Date.now()) {
    throw new Error("A data limite já passou. Edite a oportunidade e escolha uma data nova.");
  }

  const updated = await prisma.opportunity.update({ where: { id }, data: { status: "ABERTA" } });
  const [item] = await shape(userId, [updated]);
  return item;
}

export async function deleteOpportunity(userId: string, role: string | undefined, id: string) {
  assertManager(role);
  await ownOpportunity(userId, id);

  const applications = await prisma.opportunityApplication.count({ where: { opportunityId: id } });
  if (applications > 0) {
    throw new Error("Esta oportunidade já tem candidaturas. Feche-a em vez de a apagar.");
  }

  await prisma.opportunity.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Candidaturas ----------
export async function applyTo(userId: string, id: string, input: any) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  if (!opportunity) {
    throw new Error("Oportunidade não encontrada.");
  }
  if (opportunity.ownerId === userId) {
    throw new Error("Não pode candidatar-se à sua própria oportunidade.");
  }
  if (isClosed(opportunity)) {
    throw new Error("As candidaturas desta oportunidade estão fechadas.");
  }

  const exists = await prisma.opportunityApplication.findFirst({ where: { opportunityId: id, applicantId: userId } });
  if (exists) {
    throw new Error("Já enviou a sua candidatura.");
  }

  const message = clean(input?.message, 1000);
  const phone = readPhone(input?.phone);

  const created = await prisma.opportunityApplication.create({
    data: { opportunityId: id, applicantId: userId, message, phone },
  });

  const applicant = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.notification.create({
    data: {
      userId: opportunity.ownerId,
      type: "SISTEMA",
      title: "Nova candidatura",
      message: `${applicant?.name ?? "Uma pessoa"} candidatou-se a: ${opportunity.title}`,
      relatedId: id,
    },
  });

  return created;
}

export async function withdraw(userId: string, id: string) {
  const application = await prisma.opportunityApplication.findFirst({ where: { opportunityId: id, applicantId: userId } });
  if (!application) {
    throw new Error("Não tem candidatura nesta oportunidade.");
  }
  if (application.status !== "ENVIADA") {
    throw new Error("A candidatura já está a ser analisada. Fale com a organização.");
  }

  await prisma.opportunityApplication.delete({ where: { id: application.id } });
  return { id, applied: false };
}

export async function myApplications(userId: string) {
  const rows = await prisma.opportunityApplication.findMany({
    where: { applicantId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  if (rows.length === 0) return [];

  const opportunities = await prisma.opportunity.findMany({ where: { id: { in: rows.map((r) => r.opportunityId) } } });
  const map = new Map(opportunities.map((o) => [o.id, o]));
  const orgs = await orgInfo(opportunities.map((o) => o.ownerId));

  return rows
    .map((r) => {
      const o = map.get(r.opportunityId);
      if (!o) return null;
      return {
        id: r.id,
        status: r.status,
        answer: r.answer,
        createdAt: r.createdAt,
        opportunity: { id: o.id, title: o.title, kind: o.kind, deadline: o.deadline, closed: isClosed(o) },
        organization: orgs.get(o.ownerId) ?? null,
      };
    })
    .filter(Boolean);
}

export async function listApplications(
  userId: string,
  role: string | undefined,
  id: string,
  filters: { status?: string }
) {
  assertManager(role);
  const opportunity = await ownOpportunity(userId, id);

  const all = await prisma.opportunityApplication.findMany({
    where: { opportunityId: id },
    orderBy: { createdAt: "asc" },
  });

  const users = all.length
    ? await prisma.user.findMany({
        where: { id: { in: all.map((a) => a.applicantId) } },
        select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const orgs = await orgInfo(users.filter((u) => String(u.role) === "ONG").map((u) => u.id));

  const counts: Record<string, number> = {};
  all.forEach((a) => (counts[a.status] = (counts[a.status] ?? 0) + 1));

  const list = filters.status ? all.filter((a) => a.status === filters.status) : all;

  return {
    opportunity: { id: opportunity.id, title: opportunity.title, slots: opportunity.slots, closed: isClosed(opportunity) },
    counts,
    total: all.length,
    applications: list.map((a) => {
      const u = userMap.get(a.applicantId);
      return {
        id: a.id,
        status: a.status,
        message: a.message,
        answer: a.answer,
        createdAt: a.createdAt,
        phone: a.phone ?? u?.phone ?? null,
        applicant: u
          ? {
              id: u.id,
              name: orgs.get(u.id)?.name ?? u.name,
              role: u.role,
              location: u.location,
              isVerified: u.isVerified,
            }
          : null,
      };
    }),
  };
}

export async function answerApplication(
  userId: string,
  role: string | undefined,
  id: string,
  applicationId: string,
  input: any
) {
  assertManager(role);
  const opportunity = await ownOpportunity(userId, id);

  const application = await prisma.opportunityApplication.findUnique({ where: { id: applicationId } });
  if (!application || application.opportunityId !== id) {
    throw new Error("Candidatura não encontrada.");
  }

  const status = String(input?.status ?? "");
  if (!ANSWERS.includes(status)) {
    throw new Error("Estado inválido.");
  }

  const answer = clean(input?.answer, 500);
  if (status === "RECUSADA" && !answer) {
    throw new Error("Explique o motivo, para a pessoa perceber.");
  }

  const updated = await prisma.opportunityApplication.update({
    where: { id: applicationId },
    data: { status, answer: answer ?? application.answer },
  });

  const titles: Record<string, string> = {
    EM_ANALISE: "A sua candidatura está em análise",
    ACEITE: "A sua candidatura foi aceite 🎉",
    RECUSADA: "A sua candidatura não foi aceite",
  };
  await prisma.notification.create({
    data: {
      userId: application.applicantId,
      type: "SISTEMA",
      title: titles[status],
      message: `${opportunity.title}${answer ? `: ${answer}` : ""}`,
      relatedId: id,
    },
  });

  return updated;
}
