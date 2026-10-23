import { prisma } from "../lib/prisma";
import { NEED_CATEGORIES, NEED_PRIORITY } from "../lib/agentCatalog";
import { values } from "../lib/ngoCatalog";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { assertAgent, requireApproved } from "./agentService";
import { createReport } from "./govReportService";

const CATEGORY_VALUES = values(NEED_CATEGORIES);
const PRIORITY_VALUES = values(NEED_PRIORITY);
const REGION_KEYS = REGIONS.map((r) => r.key);
const MAX_NEEDS = 500;

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

function categoryLabel(value: string): string {
  return NEED_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

async function readNeed(agentId: string, input: any, existing?: any) {
  const data: any = {};

  if (!existing || input?.category !== undefined) {
    if (!CATEGORY_VALUES.includes(String(input?.category))) {
      throw new Error("Escolha o tipo de necessidade.");
    }
    data.category = String(input.category);
  }

  if (input?.priority !== undefined) {
    if (!PRIORITY_VALUES.includes(String(input.priority))) {
      throw new Error("Prioridade inválida.");
    }
    data.priority = String(input.priority);
  }

  if (!existing || input?.description !== undefined) {
    const description = clean(input?.description, 800);
    if (!description || description.length < 10) {
      throw new Error("Descreva a necessidade (pelo menos 10 letras).");
    }
    data.description = description;
  }

  if (input?.regionKey !== undefined) {
    const key = input.regionKey ? String(input.regionKey) : null;
    if (key && !REGION_KEYS.includes(key)) {
      throw new Error("Região inválida.");
    }
    data.regionKey = key;
  }
  if (input?.locality !== undefined) data.locality = clean(input.locality, 100);

  if (input?.peopleAffected !== undefined) {
    if (input.peopleAffected === null || input.peopleAffected === "") {
      data.peopleAffected = null;
    } else {
      const n = Math.floor(Number(input.peopleAffected));
      if (isNaN(n) || n < 0 || n > 1000000) {
        throw new Error("O número de pessoas afetadas é inválido.");
      }
      data.peopleAffected = n;
    }
  }

  if (input?.linkId !== undefined) {
    if (input.linkId) {
      const link = await prisma.agentClient.findUnique({ where: { id: String(input.linkId) } });
      if (!link || link.agentId !== agentId) {
        throw new Error("Cliente não encontrado.");
      }
      data.clientId = link.clientId;

      // Sem local indicado, usa o local do próprio cliente
      const noPlace = !(data.regionKey ?? existing?.regionKey) && !(data.locality ?? existing?.locality);
      if (noPlace) {
        const client = await prisma.user.findUnique({ where: { id: link.clientId }, select: { location: true } });
        if (client?.location) {
          data.locality = client.location.slice(0, 100);
          data.regionKey = findRegion(client.location)?.key ?? null;
        }
      }
    } else {
      data.clientId = null;
    }
  }

  const regionKey = data.regionKey !== undefined ? data.regionKey : existing?.regionKey ?? null;
  const locality = data.locality !== undefined ? data.locality : existing?.locality ?? null;
  const clientId = data.clientId !== undefined ? data.clientId : existing?.clientId ?? null;
  if (!regionKey && !locality && !clientId) {
    throw new Error("Indique a região, a comunidade ou a pessoa a quem se refere.");
  }

  return data;
}

async function shape(agentId: string, needs: any[]) {
  const clientIds = Array.from(new Set(needs.map((n) => n.clientId).filter(Boolean))) as string[];
  const [users, links] = clientIds.length
    ? await Promise.all([
        prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }),
        prisma.agentClient.findMany({ where: { agentId, clientId: { in: clientIds } }, select: { id: true, clientId: true } }),
      ])
    : [[], []];

  const names = new Map((users as any[]).map((u) => [u.id, u.name]));
  const linkIds = new Map((links as any[]).map((l) => [l.clientId, l.id]));

  return needs.map((n) => ({
    ...n,
    regionName: REGIONS.find((r) => r.key === n.regionKey)?.name ?? null,
    clientName: n.clientId ? names.get(n.clientId) ?? null : null,
    linkId: n.clientId ? linkIds.get(n.clientId) ?? null : null,
  }));
}

async function ownNeed(agentId: string, id: string) {
  const need = await prisma.agentNeed.findUnique({ where: { id } });
  if (!need || need.agentId !== agentId) {
    throw new Error("Necessidade não encontrada.");
  }
  return need;
}

// =====================================================================
export async function listNeeds(
  agentId: string,
  role: string | undefined,
  filters: { status?: string; category?: string; region?: string; linkId?: string; q?: string }
) {
  assertAgent(role);

  const rows = await prisma.agentNeed.findMany({ where: { agentId }, orderBy: { createdAt: "desc" }, take: 600 });

  const counts: Record<string, number> = { IDENTIFICADA: 0, ENCAMINHADA: 0, ATENDIDA: 0 };
  rows.forEach((n) => (counts[n.status] = (counts[n.status] ?? 0) + 1));

  let list = rows;
  if (filters.status) list = list.filter((n) => n.status === filters.status);
  if (filters.category) list = list.filter((n) => n.category === filters.category);
  if (filters.region) list = list.filter((n) => n.regionKey === filters.region);
  if (filters.linkId) {
    const link = await prisma.agentClient.findUnique({ where: { id: filters.linkId } });
    if (!link || link.agentId !== agentId) throw new Error("Cliente não encontrado.");
    list = list.filter((n) => n.clientId === link.clientId);
  }
  const needle = plain(filters.q);
  if (needle) list = list.filter((n) => plain(`${n.description} ${n.locality}`).includes(needle));

  const order: Record<string, number> = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
  list = [...list].sort((a, b) => {
    const openA = a.status === "ATENDIDA" ? 1 : 0;
    const openB = b.status === "ATENDIDA" ? 1 : 0;
    return openA - openB || (order[a.priority] ?? 9) - (order[b.priority] ?? 9) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return { counts: { ...counts, total: rows.length }, items: await shape(agentId, list.slice(0, 200)) };
}

export async function createNeed(agentId: string, role: string | undefined, input: any) {
  assertAgent(role);
  await requireApproved(agentId);

  const total = await prisma.agentNeed.count({ where: { agentId } });
  if (total >= MAX_NEEDS) {
    throw new Error(`Pode registar até ${MAX_NEEDS} necessidades.`);
  }

  const data = await readNeed(agentId, input);
  const created = await prisma.agentNeed.create({ data: { agentId, ...data } });

  if (created.clientId) {
    await prisma.agentActivity.create({
      data: {
        agentId,
        clientId: created.clientId,
        kind: "PROBLEMA",
        message: `Necessidade identificada: ${categoryLabel(created.category)}`,
        relatedId: created.id,
      },
    });
  }

  const [item] = await shape(agentId, [created]);
  return item;
}

export async function updateNeed(agentId: string, role: string | undefined, id: string, input: any) {
  assertAgent(role);
  const need = await ownNeed(agentId, id);

  const data = await readNeed(agentId, input, need);
  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  const updated = await prisma.agentNeed.update({ where: { id }, data });
  const [item] = await shape(agentId, [updated]);
  return item;
}

export async function setNeedServed(agentId: string, role: string | undefined, id: string, served: boolean) {
  assertAgent(role);
  const need = await ownNeed(agentId, id);

  const status = served ? "ATENDIDA" : need.reportId ? "ENCAMINHADA" : "IDENTIFICADA";
  const updated = await prisma.agentNeed.update({ where: { id }, data: { status } });

  if (served && need.clientId) {
    await prisma.agentActivity.create({
      data: { agentId, clientId: need.clientId, kind: "PROBLEMA", message: `Necessidade atendida: ${categoryLabel(need.category)}`, relatedId: need.id },
    });
  }

  const [item] = await shape(agentId, [updated]);
  return item;
}

// Encaminha a necessidade a uma instituição pública (ou a todas): vira um pedido com protocolo
export async function forwardNeed(agentId: string, role: string | undefined, id: string, input: any) {
  assertAgent(role);
  await requireApproved(agentId);
  const need = await ownNeed(agentId, id);

  if (need.status !== "IDENTIFICADA") {
    throw new Error(need.status === "ENCAMINHADA" ? "Esta necessidade já foi encaminhada." : "Esta necessidade já foi atendida.");
  }

  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { name: true } });
  const regionName = REGIONS.find((r) => r.key === need.regionKey)?.name;

  const lines = [
    need.description,
    "",
    `Identificado pelo agente ${agent?.name ?? "do NÔDJUNTA AGRO"}${need.locality ? ` em ${need.locality}` : ""}.`,
    need.peopleAffected ? `Pessoas afetadas: ${need.peopleAffected}.` : "",
  ];

  const report = await createReport(agentId, {
    category: "PEDIDO_APOIO",
    title: `Necessidade: ${categoryLabel(need.category)}`,
    message: lines.filter((l, i) => l || i === 1).join("\n"),
    institutionId: input?.institutionId || undefined,
    region: regionName,
    location: need.locality ?? undefined,
  });

  const updated = await prisma.agentNeed.update({
    where: { id },
    data: {
      status: "ENCAMINHADA",
      institutionId: input?.institutionId || null,
      reportId: report.id,
      protocol: report.protocol,
      forwardedAt: new Date(),
    },
  });

  if (need.clientId) {
    await prisma.agentActivity.create({
      data: {
        agentId,
        clientId: need.clientId,
        kind: "PROBLEMA",
        message: `Necessidade encaminhada (${report.protocol})`,
        relatedId: need.id,
      },
    });
  }

  const [item] = await shape(agentId, [updated]);
  return { need: item, protocol: report.protocol, reportId: report.id };
}

export async function deleteNeed(agentId: string, role: string | undefined, id: string) {
  assertAgent(role);
  await ownNeed(agentId, id);

  await prisma.agentNeed.delete({ where: { id } });
  return { id, deleted: true };
}
