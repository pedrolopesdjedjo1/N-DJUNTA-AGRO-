import { prisma } from "../lib/prisma";
import { TASK_KINDS, TASK_PRIORITY } from "../lib/agentCatalog";
import { values } from "../lib/ngoCatalog";
import { assertAgent } from "./agentService";

const KIND_VALUES = values(TASK_KINDS);
const PRIORITY_VALUES = values(TASK_PRIORITY);
const MAX_OPEN = 300;
const DAY = 86400000;

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

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function clientOfLink(agentId: string, linkId: any): Promise<string> {
  const link = await prisma.agentClient.findUnique({ where: { id: String(linkId) } });
  if (!link || link.agentId !== agentId) {
    throw new Error("Cliente não encontrado.");
  }
  return link.clientId;
}

async function readTask(agentId: string, input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.title !== undefined) {
    const title = clean(input?.title, 150);
    if (!title || title.length < 3) {
      throw new Error("Escreva o título da tarefa.");
    }
    data.title = title;
  }

  if (input?.description !== undefined) data.description = clean(input.description, 600);

  if (input?.priority !== undefined) {
    if (!PRIORITY_VALUES.includes(String(input.priority))) {
      throw new Error("Prioridade inválida.");
    }
    data.priority = String(input.priority);
  }

  if (input?.kind !== undefined) {
    if (!KIND_VALUES.includes(String(input.kind))) {
      throw new Error("Tipo de tarefa inválido.");
    }
    data.kind = String(input.kind);
  }

  if (input?.dueDate !== undefined) {
    if (input.dueDate === null || input.dueDate === "") {
      data.dueDate = null;
    } else {
      const due = new Date(input.dueDate);
      if (isNaN(due.getTime())) {
        throw new Error("Data limite inválida.");
      }
      const changed = !existing?.dueDate || new Date(existing.dueDate).getTime() !== due.getTime();
      if (changed && due.getTime() < startOfToday().getTime()) {
        throw new Error("A data limite não pode ser no passado.");
      }
      data.dueDate = due;
    }
  }

  if (input?.linkId !== undefined) {
    data.clientId = input.linkId ? await clientOfLink(agentId, input.linkId) : null;
  }

  return data;
}

async function shape(agentId: string, tasks: any[]) {
  const clientIds = Array.from(new Set(tasks.map((t) => t.clientId).filter(Boolean))) as string[];
  const [users, links] = clientIds.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }),
        prisma.agentClient.findMany({ where: { agentId, clientId: { in: clientIds } }, select: { id: true, clientId: true } }),
      ])
    : [[], []];

  const names = new Map((users as any[]).map((u) => [u.id, u.name]));
  const linkIds = new Map((links as any[]).map((l) => [l.clientId, l.id]));

  const today = startOfToday().getTime();
  return tasks.map((t) => {
    const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
    const pending = t.status === "PENDENTE";
    return {
      ...t,
      clientName: t.clientId ? names.get(t.clientId) ?? null : null,
      linkId: t.clientId ? linkIds.get(t.clientId) ?? null : null,
      overdue: pending && due !== null && due < today,
      dueToday: pending && due !== null && due >= today && due < today + DAY,
    };
  });
}

// =====================================================================
export async function listTasks(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; linkId?: string; when?: string; kind?: string; q?: string }
) {
  assertAgent(role);

  const [pending, done] = await Promise.all([
    prisma.agentTask.findMany({ where: { agentId, status: "PENDENTE" }, take: 400 }),
    prisma.agentTask.findMany({ where: { agentId, status: "FEITA" }, orderBy: { doneAt: "desc" }, take: 60 }),
  ]);

  const today = startOfToday().getTime();
  const counts = {
    pending: pending.length,
    overdue: pending.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < today).length,
    today: pending.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= today && new Date(t.dueDate).getTime() < today + DAY).length,
    week: pending.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= today && new Date(t.dueDate).getTime() < today + 7 * DAY).length,
    done: done.length,
  };

  let list = filters.status === "FEITA" ? done : pending;

  if (filters.linkId) {
    const clientId = await clientOfLink(agentId, filters.linkId);
    list = list.filter((t) => t.clientId === clientId);
  }
  if (filters.kind) list = list.filter((t) => t.kind === filters.kind);

  if (filters.status !== "FEITA") {
    if (filters.when === "overdue") list = list.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < today);
    else if (filters.when === "today") list = list.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= today && new Date(t.dueDate).getTime() < today + DAY);
    else if (filters.when === "week") list = list.filter((t) => t.dueDate && new Date(t.dueDate).getTime() >= today && new Date(t.dueDate).getTime() < today + 7 * DAY);
  }

  const needle = plain(filters.q);
  if (needle) list = list.filter((t) => plain(`${t.title} ${t.description}`).includes(needle));

  if (filters.status !== "FEITA") {
    list = [...list].sort((a, b) => {
      const pa = a.priority === "ALTA" ? 0 : 1;
      const pb = b.priority === "ALTA" ? 0 : 1;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return pa - pb || da - db || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return { counts, items: await shape(agentId, list) };
}

export async function createTask(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);

  const open = await prisma.agentTask.count({ where: { agentId, status: "PENDENTE" } });
  if (open >= MAX_OPEN) {
    throw new Error(`Pode ter até ${MAX_OPEN} tarefas pendentes. Conclua ou apague algumas.`);
  }

  const data = await readTask(agentId, input);
  const created = await prisma.agentTask.create({ data: { agentId, ...data } });
  const [item] = await shape(agentId, [created]);
  return item;
}

async function ownTask(agentId: string, id: string) {
  const task = await prisma.agentTask.findUnique({ where: { id } });
  if (!task || task.agentId !== agentId) {
    throw new Error("Tarefa não encontrada.");
  }
  return task;
}

export async function updateTask(agentId: string, role: string | undefined, id: string, input: any) {
  assertAgent(role);
  const task = await ownTask(agentId, id);

  const data = await readTask(agentId, input, task);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.agentTask.update({ where: { id }, data });
  const [item] = await shape(agentId, [updated]);
  return item;
}

export async function setTaskStatus(agentId: string, role: string | undefined, id: string, done: boolean) {
  assertAgent(role);
  const task = await ownTask(agentId, id);

  if (done && task.status === "FEITA") {
    throw new Error("Esta tarefa já está concluída.");
  }
  if (!done && task.status === "PENDENTE") {
    throw new Error("Esta tarefa já está pendente.");
  }

  const updated = await prisma.agentTask.update({
    where: { id },
    data: done ? { status: "FEITA", doneAt: new Date() } : { status: "PENDENTE", doneAt: null },
  });

  if (done && task.clientId) {
    await prisma.agentActivity.create({
      data: { agentId, clientId: task.clientId, kind: "TAREFA", message: `Tarefa concluída: ${task.title}`, relatedId: task.id },
    });
  }

  const [item] = await shape(agentId, [updated]);
  return item;
}

export async function deleteTask(agentId: string, role: string | undefined, id: string) {
  assertAgent(role);
  await ownTask(agentId, id);

  await prisma.agentTask.delete({ where: { id } });
  return { id, deleted: true };
}
