import { prisma } from "../lib/prisma";
import { stageOf } from "../lib/agentOpsCatalog";
import { deliveryPhase } from "../lib/transportCatalog";
import { hydrate } from "./transportDeliveryService";

const MIN = 60000;
const MAX_PER_RUN = 3;
let started = false;
let running = false;

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

// O veículo serve a esta carga?
function fits(profile: any, weightKg: number, cargo: string[]): boolean {
  if (!profile.vehicleType || !profile.capacityKg || profile.vehicleStatus !== "OPERACIONAL") return false;
  if (weightKg > profile.capacityKg) return false;
  if ((profile.cargoTypes ?? []).length > 0 && cargo.some((c) => !profile.cargoTypes.includes(c))) return false;
  return true;
}

async function noticed(kind: string, deliveryIds: string[]): Promise<Set<string>> {
  if (deliveryIds.length === 0) return new Set();
  const rows = await prisma.loadNotice.findMany({ where: { kind, deliveryId: { in: deliveryIds } } });
  return new Set(rows.map((r) => `${r.deliveryId}:${r.transporterId}`));
}

async function send(entries: { transporterId: string; deliveryId: string; kind: string; title: string; message: string }[]) {
  if (entries.length === 0) return;

  await prisma.loadNotice.createMany({
    data: entries.map((e) => ({ deliveryId: e.deliveryId, transporterId: e.transporterId, kind: e.kind })),
    skipDuplicates: true,
  });
  await prisma.notification.createMany({
    data: entries.map((e) => ({ userId: e.transporterId, type: "SISTEMA" as const, title: e.title, message: e.message.slice(0, 300), relatedId: e.deliveryId })),
  });
}

// 1. Cargas novas que servem ao veículo e às regiões de cada transportador
async function newLoads() {
  const since = new Date(Date.now() - 30 * MIN);
  const rows: any[] = await prisma.delivery.findMany({ where: { transporterId: null, createdAt: { gte: since } }, take: 100 });
  const open = rows.filter((d) => deliveryPhase(d) === "DISPONIVEL");
  if (open.length === 0) return;

  const cards = (await hydrate(open, { userId: "", profile: null })).filter((c) => c.phase === "DISPONIVEL" && !!c.orderId);
  if (cards.length === 0) return;

  const profiles = await prisma.transporterProfile.findMany({ where: { isAvailable: true, notifyNewLoads: true, vehicleType: { not: null } }, take: 500 });
  const users = profiles.length ? await prisma.user.findMany({ where: { id: { in: profiles.map((p) => p.userId) }, isActive: true }, select: { id: true } }) : [];
  const active = new Set(users.map((u) => u.id));
  const done = await noticed("NEW_LOAD", cards.map((c) => c.id));

  const entries: any[] = [];
  profiles.forEach((p) => {
    if (!active.has(p.userId) || p.regions.length === 0) return;

    let count = 0;
    cards.forEach((c) => {
      if (count >= MAX_PER_RUN || done.has(`${c.id}:${p.userId}`)) return;
      const inRegion = [c.pickup.regionKey, c.destination.regionKey].some((k: string | null) => !!k && p.regions.includes(k));
      if (!inRegion || !fits(p, c.weightKg, c.cargoTypes)) return;

      count += 1;
      entries.push({
        transporterId: p.userId,
        deliveryId: c.id,
        kind: "NEW_LOAD",
        title: "Nova carga disponível",
        message: `${c.items.slice(0, 2).map((i: any) => i.title).join(", ") || "Produtos"}: ${c.pickup.regionName ?? "recolha"} → ${c.destination.regionName ?? "destino"}${c.payout ? `, ${Math.round(c.payout)} FCFA` : ""}.`,
      });
    });
  });

  await send(entries);
}

// 2. Produtos prontos para recolher e encomendas canceladas depois de aceites
async function readyAndCancelled() {
  const active: any[] = await prisma.delivery.findMany({ where: { transporterId: { not: null } }, orderBy: { createdAt: "desc" }, take: 500 });
  const open = active.filter((d) => ["ACEITE", "EM_TRANSPORTE"].includes(deliveryPhase(d)));
  if (open.length === 0) return;

  const orders: any[] = await prisma.order.findMany({ where: { id: { in: open.map((d) => d.orderId).filter(Boolean) } }, select: { id: true, status: true } });
  const stageOfOrder = new Map(orders.map((o) => [o.id, stageOf(o.status)]));

  const cancelled = open.filter((d) => stageOfOrder.get(d.orderId) === "CANCELADA");
  const ready = open.filter((d) => deliveryPhase(d) === "ACEITE" && stageOfOrder.get(d.orderId) === "PRONTO");
  const doneCancel = await noticed("ORDER_CANCELLED", cancelled.map((d) => d.id));
  const doneReady = await noticed("READY", ready.map((d) => d.id));

  const entries: any[] = [];
  cancelled.forEach((d) => {
    if (doneCancel.has(`${d.id}:${d.transporterId}`)) return;
    entries.push({
      transporterId: d.transporterId,
      deliveryId: d.id,
      kind: "ORDER_CANCELLED",
      title: "Encomenda cancelada",
      message: `A encomenda ${shortId(d.orderId)} foi cancelada. Não precisa de fazer esta entrega.`,
    });
  });
  ready.forEach((d) => {
    if (doneReady.has(`${d.id}:${d.transporterId}`)) return;
    entries.push({
      transporterId: d.transporterId,
      deliveryId: d.id,
      kind: "READY",
      title: "Produtos prontos para recolher",
      message: `Os produtos da encomenda ${shortId(d.orderId)} já estão prontos. Pode ir recolher.`,
    });
  });

  await send(entries);
}

// 3. Pagamentos do transporte por receber há mais de 3 dias
async function payoutReminders() {
  const old = await prisma.transportPayout.findMany({ where: { status: "PENDENTE", createdAt: { lt: new Date(Date.now() - 3 * 86400000) } }, take: 200 });
  if (old.length === 0) return;

  const done = await noticed("PAYOUT_REMINDER", old.map((p) => p.deliveryId));
  const entries = old
    .filter((p) => !done.has(`${p.deliveryId}:${p.transporterId}`))
    .map((p) => ({
      transporterId: p.transporterId,
      deliveryId: p.deliveryId,
      kind: "PAYOUT_REMINDER",
      title: "Pagamento por receber",
      message: `Tem ${Math.round(p.netAmount)} FCFA por receber da encomenda ${shortId(p.orderId)}. Confirme em Ganhos quando receber, ou reclame se não chegou.`,
    }));

  await send(entries);
}

async function runOnce() {
  if (running) return;
  running = true;

  for (const job of [newLoads, readyAndCancelled, payoutReminders]) {
    try {
      await job();
    } catch (error) {
      console.error("transportNotifier", error);
    }
  }
  running = false;
}

// Chamar uma vez no server.ts, depois de o servidor arrancar
export function startTransportNotifier() {
  if (started) return;
  started = true;

  setTimeout(runOnce, 60 * 1000);
  setInterval(runOnce, 5 * MIN);
}
