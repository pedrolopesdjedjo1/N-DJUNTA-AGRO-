import { prisma } from "../lib/prisma";
import { EXPENSE_CATEGORIES, FUNDING_KINDS, FUNDING_STATUS, values } from "../lib/ngoCatalog";
import { assertNgo } from "./organizationService";

const KIND_VALUES = values(FUNDING_KINDS);
const STATUS_VALUES = values(FUNDING_STATUS);
const CATEGORY_VALUES = values(EXPENSE_CATEGORIES);

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

function readAmount(value: any, label: string): number {
  const n = Number(String(value ?? "").replace(",", "."));
  if (isNaN(n) || n <= 0 || n > 1e13) {
    throw new Error(`${label} inválido.`);
  }
  return Math.round(n * 100) / 100;
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

function money(value: number) {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
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

async function ownPartner(userId: string, id: string) {
  const partner = await prisma.ngoPartner.findUnique({ where: { id } });
  if (!partner || partner.ownerId !== userId) {
    throw new Error("Parceiro não encontrado.");
  }
  return partner;
}

// ---------- Financiamentos ----------
export async function listFunding(
  userId: string,
  role: string | undefined,
  filters: { status?: string; projectId?: string; kind?: string }
) {
  assertNgo(role);

  const all = await prisma.ngoFunding.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" }, take: 1000 });

  const projectIds = Array.from(new Set(all.map((f) => f.projectId).filter(Boolean))) as string[];
  const partnerIds = Array.from(new Set(all.map((f) => f.partnerId).filter(Boolean))) as string[];
  const [projects, partners] = await Promise.all([
    projectIds.length ? prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }) : [],
    partnerIds.length ? prisma.ngoPartner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, name: true } }) : [],
  ]);
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  const partnerNames = new Map(partners.map((p) => [p.id, p.name]));

  const sum = (status: string) =>
    all.filter((f) => f.status === status).reduce((s, f) => s + f.amount, 0);

  const byStatus: Record<string, { count: number; amount: number }> = {};
  all.forEach((f) => {
    const current = byStatus[f.status] ?? { count: 0, amount: 0 };
    current.count += 1;
    current.amount += f.amount;
    byStatus[f.status] = current;
  });

  const funded = new Map<string, { projectId: string; name: string; approved: number; received: number }>();
  all
    .filter((f) => f.projectId && (f.status === "APROVADO" || f.status === "RECEBIDO"))
    .forEach((f) => {
      const row = funded.get(f.projectId!) ?? {
        projectId: f.projectId!,
        name: projectNames.get(f.projectId!) ?? "Projeto",
        approved: 0,
        received: 0,
      };
      if (f.status === "APROVADO") row.approved += f.amount;
      else row.received += f.amount;
      funded.set(f.projectId!, row);
    });

  let items = all;
  if (filters.status && STATUS_VALUES.includes(filters.status)) items = items.filter((f) => f.status === filters.status);
  if (filters.projectId) items = items.filter((f) => f.projectId === filters.projectId);
  if (filters.kind && KIND_VALUES.includes(filters.kind)) items = items.filter((f) => f.kind === filters.kind);

  return {
    summary: {
      received: sum("RECEBIDO"),
      approved: sum("APROVADO"),
      requested: sum("SOLICITADO"),
      prospecting: sum("PROSPECCAO"),
      byStatus,
    },
    fundedProjects: Array.from(funded.values()),
    items: items.map((f) => ({
      ...f,
      projectName: f.projectId ? projectNames.get(f.projectId) ?? null : null,
      partnerName: f.partnerId ? partnerNames.get(f.partnerId) ?? null : null,
    })),
  };
}

export async function createFunding(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const title = clean(input?.title, 150);
  if (!title || title.length < 3) {
    throw new Error("Escreva o nome do financiamento.");
  }

  const kind = String(input?.kind ?? "FINANCIAMENTO");
  if (!KIND_VALUES.includes(kind)) {
    throw new Error("Tipo de financiamento inválido.");
  }

  const status = String(input?.status ?? "PROSPECCAO");
  if (!STATUS_VALUES.includes(status)) {
    throw new Error("Estado inválido.");
  }

  const amount = readAmount(input?.amount, "Valor");

  let projectId: string | null = null;
  if (input?.projectId) projectId = (await ownProject(userId, String(input.projectId))).id;
  let partnerId: string | null = null;
  if (input?.partnerId) partnerId = (await ownPartner(userId, String(input.partnerId))).id;

  const now = new Date();
  const dueDate = readDate(input?.dueDate, "Data limite");

  return prisma.ngoFunding.create({
    data: {
      ownerId: userId,
      projectId,
      partnerId,
      kind,
      title,
      amount,
      status,
      requestedAt: ["SOLICITADO", "APROVADO", "RECEBIDO"].includes(status) ? now : null,
      approvedAt: ["APROVADO", "RECEBIDO"].includes(status) ? now : null,
      receivedAt: status === "RECEBIDO" ? now : null,
      dueDate: dueDate ?? null,
      notes: clean(input?.notes, 500),
    },
  });
}

export async function updateFunding(userId: string, role: string | undefined, id: string, input: any) {
  assertNgo(role);

  const found = await prisma.ngoFunding.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Financiamento não encontrado.");
  }

  const data: any = {};

  if (input?.title !== undefined) {
    const title = clean(input.title, 150);
    if (!title || title.length < 3) {
      throw new Error("Escreva o nome do financiamento.");
    }
    data.title = title;
  }
  if (input?.kind !== undefined) {
    if (!KIND_VALUES.includes(String(input.kind))) {
      throw new Error("Tipo de financiamento inválido.");
    }
    data.kind = String(input.kind);
  }
  if (input?.amount !== undefined) data.amount = readAmount(input.amount, "Valor");
  if (input?.notes !== undefined) data.notes = clean(input.notes, 500);

  const due = readDate(input?.dueDate, "Data limite");
  if (due !== undefined) data.dueDate = due;

  if (input?.projectId !== undefined) {
    data.projectId = input.projectId ? (await ownProject(userId, String(input.projectId))).id : null;
  }
  if (input?.partnerId !== undefined) {
    data.partnerId = input.partnerId ? (await ownPartner(userId, String(input.partnerId))).id : null;
  }

  if (input?.status !== undefined) {
    const status = String(input.status);
    if (!STATUS_VALUES.includes(status)) {
      throw new Error("Estado inválido.");
    }
    data.status = status;

    const now = new Date();
    if (["SOLICITADO", "APROVADO", "RECEBIDO"].includes(status) && !found.requestedAt) data.requestedAt = now;
    if (["APROVADO", "RECEBIDO"].includes(status) && !found.approvedAt) data.approvedAt = now;
    if (status === "RECEBIDO" && !found.receivedAt) data.receivedAt = now;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  return prisma.ngoFunding.update({ where: { id }, data });
}

export async function deleteFunding(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const found = await prisma.ngoFunding.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Financiamento não encontrado.");
  }
  await prisma.ngoFunding.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Despesas ----------
export async function listExpenses(
  userId: string,
  role: string | undefined,
  filters: { projectId?: string; category?: string; from?: string; to?: string }
) {
  assertNgo(role);

  const where: any = { ownerId: userId };
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.category && CATEGORY_VALUES.includes(filters.category)) where.category = filters.category;

  const range: any = {};
  const from = readDate(filters.from, "Data inicial");
  const to = readDate(filters.to, "Data final");
  if (from) range.gte = from;
  if (to) {
    to.setHours(23, 59, 59, 999);
    range.lte = to;
  }
  if (Object.keys(range).length) where.spentAt = range;

  const items = await prisma.ngoExpense.findMany({ where, orderBy: { spentAt: "desc" }, take: 300 });

  const projectIds = Array.from(new Set(items.map((e) => e.projectId).filter(Boolean))) as string[];
  const projects = projectIds.length
    ? await prisma.ngoProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(projects.map((p) => [p.id, p.name]));

  const byCategory = new Map<string, number>();
  items.forEach((e) => byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount));

  return {
    total: items.reduce((s, e) => s + e.amount, 0),
    byCategory: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, label: label(EXPENSE_CATEGORIES, category), amount }))
      .sort((a, b) => b.amount - a.amount),
    items: items.map((e) => ({ ...e, projectName: e.projectId ? names.get(e.projectId) ?? null : null })),
  };
}

export async function createExpense(userId: string, role: string | undefined, input: any) {
  assertNgo(role);

  const category = String(input?.category ?? "");
  if (!CATEGORY_VALUES.includes(category)) {
    throw new Error("Escolha o tipo de despesa.");
  }
  const description = clean(input?.description, 200);
  if (!description || description.length < 3) {
    throw new Error("Descreva a despesa.");
  }
  const amount = readAmount(input?.amount, "Valor");

  const spentAt = input?.spentAt ? new Date(input.spentAt) : new Date();
  if (isNaN(spentAt.getTime()) || spentAt.getTime() > Date.now() + 86400000) {
    throw new Error("Data da despesa inválida.");
  }

  let projectId: string | null = null;
  if (input?.projectId) projectId = (await ownProject(userId, String(input.projectId))).id;

  let fundingId: string | null = null;
  if (input?.fundingId) {
    const funding = await prisma.ngoFunding.findUnique({ where: { id: String(input.fundingId) } });
    if (!funding || funding.ownerId !== userId) {
      throw new Error("Financiamento não encontrado.");
    }
    fundingId = funding.id;
  }

  if (input?.receiptUrl && !validStorageUrl(input.receiptUrl)) {
    throw new Error("Comprovativo inválido.");
  }

  return prisma.ngoExpense.create({
    data: {
      ownerId: userId,
      projectId,
      fundingId,
      category,
      description,
      amount,
      spentAt,
      receiptUrl: input?.receiptUrl || null,
    },
  });
}

export async function deleteExpense(userId: string, role: string | undefined, id: string) {
  assertNgo(role);
  const found = await prisma.ngoExpense.findUnique({ where: { id } });
  if (!found || found.ownerId !== userId) {
    throw new Error("Despesa não encontrada.");
  }
  await prisma.ngoExpense.delete({ where: { id } });
  return { id, deleted: true };
}

// ---------- Relatório financeiro ----------
export async function financeReport(
  userId: string,
  role: string | undefined,
  filters: { projectId?: string; from?: string; to?: string }
) {
  assertNgo(role);

  const from = readDate(filters.from, "Data inicial") ?? null;
  const to = readDate(filters.to, "Data final") ?? null;
  if (to) to.setHours(23, 59, 59, 999);
  if (filters.projectId) await ownProject(userId, filters.projectId);

  const inRange = (d: Date) => (!from || d >= from) && (!to || d <= to);
  const scope = filters.projectId ? { projectId: filters.projectId } : {};

  const [funding, expenses, projects] = await Promise.all([
    prisma.ngoFunding.findMany({ where: { ownerId: userId, ...scope } }),
    prisma.ngoExpense.findMany({ where: { ownerId: userId, ...scope } }),
    prisma.ngoProject.findMany({
      where: { ownerId: userId, ...(filters.projectId ? { id: filters.projectId } : {}) },
      select: { id: true, name: true, budget: true, status: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const received = funding.filter((f) => f.status === "RECEBIDO" && inRange(f.receivedAt ?? f.createdAt));
  const approved = funding.filter((f) => f.status === "APROVADO");
  const requested = funding.filter((f) => f.status === "SOLICITADO");
  const spentItems = expenses.filter((e) => inRange(e.spentAt));

  const total = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);
  const totals = {
    received: total(received),
    approved: total(approved),
    requested: total(requested),
    spent: total(spentItems),
    balance: total(received) - total(spentItems),
  };

  const byCategoryMap = new Map<string, number>();
  spentItems.forEach((e) => byCategoryMap.set(e.category, (byCategoryMap.get(e.category) ?? 0) + e.amount));
  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, amount]) => ({ category, label: label(EXPENSE_CATEGORIES, category), amount }))
    .sort((a, b) => b.amount - a.amount);

  const byKindMap = new Map<string, number>();
  received.forEach((f) => byKindMap.set(f.kind, (byKindMap.get(f.kind) ?? 0) + f.amount));
  const byKind = Array.from(byKindMap.entries()).map(([kind, amount]) => ({ kind, label: label(FUNDING_KINDS, kind), amount }));

  const rows = projects.map((p) => {
    const rec = total(received.filter((f) => f.projectId === p.id));
    const apr = total(approved.filter((f) => f.projectId === p.id));
    const sp = total(spentItems.filter((e) => e.projectId === p.id));
    return {
      projectId: p.id,
      name: p.name,
      status: p.status,
      budget: p.budget,
      received: rec,
      approved: apr,
      spent: sp,
      balance: rec - sp,
      executionPercent: p.budget && p.budget > 0 ? Math.round((sp / p.budget) * 100) : null,
    };
  });

  if (!filters.projectId) {
    const noProject = {
      received: total(received.filter((f) => !f.projectId)),
      approved: total(approved.filter((f) => !f.projectId)),
      spent: total(spentItems.filter((e) => !e.projectId)),
    };
    if (noProject.received || noProject.approved || noProject.spent) {
      rows.push({
        projectId: "",
        name: "Sem projeto",
        status: "",
        budget: null,
        received: noProject.received,
        approved: noProject.approved,
        spent: noProject.spent,
        balance: noProject.received - noProject.spent,
        executionPercent: null,
      });
    }
  }

  const partnerIds = Array.from(new Set(received.map((f) => f.partnerId).filter(Boolean))) as string[];
  const partners = partnerIds.length
    ? await prisma.ngoPartner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, name: true } })
    : [];
  const partnerNames = new Map(partners.map((p) => [p.id, p.name]));
  const partnerMap = new Map<string, number>();
  received.forEach((f) => {
    const key = f.partnerId ? partnerNames.get(f.partnerId) ?? "Parceiro" : "Sem parceiro indicado";
    partnerMap.set(key, (partnerMap.get(key) ?? 0) + f.amount);
  });
  const byPartner = Array.from(partnerMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const org = await prisma.organization.findUnique({ where: { ownerId: userId }, select: { name: true } });
  const dateText = (d: Date) => d.toISOString().slice(0, 10);

  const lines = [
    `RELATÓRIO FINANCEIRO${org ? ` - ${org.name}` : ""}`,
    `Período: ${from ? dateText(from) : "início"} a ${to ? dateText(to) : "hoje"}`,
    filters.projectId && projects[0] ? `Projeto: ${projects[0].name}` : "Todos os projetos",
    "",
    `Recebido: ${money(totals.received)}`,
    `Aprovado, por receber: ${money(totals.approved)}`,
    `Solicitado: ${money(totals.requested)}`,
    `Gasto: ${money(totals.spent)}`,
    `Saldo: ${money(totals.balance)}`,
    "",
    ...(byCategory.length ? ["Despesas por tipo:", ...byCategory.map((c) => `- ${c.label}: ${money(c.amount)}`), ""] : []),
    ...(rows.length && !filters.projectId
      ? ["Por projeto:", ...rows.map((r) => `- ${r.name}: recebido ${money(r.received)}, gasto ${money(r.spent)}, saldo ${money(r.balance)}`)]
      : []),
  ];

  return {
    period: { from, to },
    totals,
    byCategory,
    byKind,
    byPartner,
    byProject: rows,
    text: lines.join("\n"),
  };
}
