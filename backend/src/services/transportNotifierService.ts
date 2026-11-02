import { prisma } from "../lib/prisma";
import { stageOf } from "../lib/agentOpsCatalog";
import { deliveryPhase } from "../lib/transportCatalog";
import { hydrate } from "./transportDeliveryService";

const DAY = 86400000;
const WINDOW_MIN = 45;
const MAX_PER_RUN = 3;

let running = false;
let timer: NodeJS.Timeout | null = null;

function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

async function notify(rows: { userId: string; title: string; message: string; relatedId: string }[]) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.notification.createMany({
      data: rows.slice(i, i + 500).map((r) => ({ userId: r.userId, type: "SISTEMA" as const, title: r.title, message: r.message.slice(0, 300), relatedId: r.relatedId })),
    });
  }
}

// Avisa os transportadores das cargas novas que servem ao seu veículo e às suas regiões
async function newLoads() {
  const rows: any[] = await prisma.delivery.findMany({
    where: { transporterId: null, createdAt: { gte: new Date(Date.now() - WINDOW_MIN * 60000) } },
    take: 100,
  });
  const open = rows.filter((d) => deliveryPhase(d) === "DISPONIVEL");
  if (open.length === 0) return;

  const cards = (await hydrate(open, { userId: "", profile: null })).filter((c) => !!c.orderId);
  if (cards.length === 0) return;

  const profiles = await prisma.transporterProfile.findMany({
    where: { isAvailable: true, notifyNewLoads: true, vehicleStatus: "OPERACIONAL", vehicleType: { not: null }, capacityKg: { not: null } },
    take: 1000,
  });
  if (profiles.length === 0) return;

  const activeUsers = await prisma.user.findMany({ where: { id: { in: profiles.map((p) => p.userId) }, isActive: true }, select: { id: true } });
  const active = new Set(activeUsers.map((u) => u.id));
  const [existing, dismissed] = await Promise.all([
    prisma.deliveryNotice.findMany({ where: { kind: "NEW_LOAD", deliveryId: { in: cards.map((c) => c.id) } }, select: { transporterId: true, deliveryId: true } }),
    prisma.deliveryDismissal.findMany({ where: { deliveryId: { in: cards.map((c) => c.id) } }, select: { transporterId: true, deliveryId: true } }),
  ]);
  const seen = new Set([...existing, ...dismissed].map((e) => `${e.transporterId}:${e.deliveryId}`));

  const notices: { transporterId: string; deliveryId: string; kind: string }[] = [];
  const messages: { userId: string; title: string; message: string; relatedId: string }[] = [];

  for (const profile of profiles) {
    if (!active.has(profile.userId)) continue;
    let sent = 0;

    for (const c of cards) {
      if (sent >= MAX_PER_RUN) break;
      if (seen.has(`${profile.userId}:${c.id}`)) continue;

      const regionOk = profile.regions.length === 0 || [c.pickup.regionKey, c.destination.regionKey].some((k) => !!k && profile.regions.includes(k as string));
      const capacityOk = c.weightKg <= (profile.capacityKg as number);
      const cargoOk = profile.cargoTypes.length === 0 || c.cargoTypes.every((t: string) => profile.cargoTypes.includes(t));
      if (!regionOk || !capacityOk || !cargoOk) continue;

      notices.push({ transporterId: profile.userId, deliveryId: c.id, kind: "NEW_LOAD" });
      messages.push({
        userId: profile.userId,
        title: "Nova carga disponível",
        message: `${c.pickup.regionName ?? c.pickup.text ?? "Recolha"} → ${c.destination.regionName ?? c.destination.text ?? "Destino"}${c.payout ? ` · ${Math.round(c.payout)} FCFA` : ""}${c.weightKg ? ` · ${c.weightKg} kg` : ""}`,
        relatedId: c.id,
      });
      sent += 1;
    }
  }

  if (notices.length > 0) {
    await prisma.deliveryNotice.createMany({ data: notices, skipDuplicates: true });
    await notify(messages);
  }
}

// Encomendas canceladas ou alteradas enquanto o transportador as tem aceites
async function orderChanges() {
  const rows: any[] = await prisma.delivery.findMany({ where: { transporterId: { not: null } }, orderBy: { createdAt: "desc" }, take: 600 });
  const orderIds = Array.from(new Set(rows.map((d) => d.orderId).filter(Boolean))) as string[];
  if (orderIds.length === 0) return;

  const orders: any[] = await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, status: true, updatedAt: true } });
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const accepted: any[] = await prisma.deliveryEvent.findMany({ where: { deliveryId: { in: rows.map((d) => d.id) }, kind: "ACEITE" }, select: { deliveryId: true, createdAt: true, actorId: true } });
  const acceptedAt = new Map(accepted.map((e) => [`${e.actorId}:${e.deliveryId}`, new Date(e.createdAt).getTime()]));

  const wanted: { transporterId: string; deliveryId: string; kind: string; title: string; message: string }[] = [];
  rows.forEach((d) => {
    const order = orderMap.get(d.orderId);
    if (!order || !d.transporterId) return;
    const phase = deliveryPhase(d, order);

    if (phase !== "ENTREGUE" && stageOf(order.status) === "CANCELADA") {
      wanted.push({
        transporterId: d.transporterId,
        deliveryId: d.id,
        kind: "ORDER_CANCELLED",
        title: "A encomenda foi cancelada",
        message: `A encomenda ${shortId(d.orderId)} foi cancelada. ${phase === "EM_TRANSPORTE" ? "Fale com o vendedor e o comprador sobre os produtos que já recolheu." : "Não precisa de a recolher."}`,
      });
      return;
    }

    if (phase === "ACEITE") {
      const since = acceptedAt.get(`${d.transporterId}:${d.id}`);
      const changed = new Date(order.updatedAt).getTime();
      if (since && changed > since + 60000) {
        wanted.push({
          transporterId: d.transporterId,
          deliveryId: d.id,
          kind: `ORDER_CHANGED:${Math.floor(changed / 60000)}`,
          title: "A encomenda mudou",
          message: `A encomenda ${shortId(d.orderId)} foi alterada (por exemplo, os produtos podem já estar prontos). Veja os detalhes.`,
        });
      }
    }
  });

  if (wanted.length === 0) return;
  const existing = await prisma.deliveryNotice.findMany({
    where: { deliveryId: { in: Array.from(new Set(wanted.map((w) => w.deliveryId))) } },
    select: { transporterId: true, deliveryId: true, kind: true },
  });
  const seen = new Set(existing.map((e) => `${e.transporterId}:${e.deliveryId}:${e.kind}`));
  const fresh = wanted.filter((w) => !seen.has(`${w.transporterId}:${w.deliveryId}:${w.kind}`));
  if (fresh.length === 0) return;

  await prisma.deliveryNotice.createMany({ data: fresh.map((w) => ({ transporterId: w.transporterId, deliveryId: w.deliveryId, kind: w.kind })), skipDuplicates: true });
  await notify(fresh.map((w) => ({ userId: w.transporterId, title: w.title, message: w.message, relatedId: w.deliveryId })));
}

// Lembra os pagamentos por confirmar há mais de 3 dias (uma vez por semana)
async function payoutReminders() {
  const old = await prisma.transportPayout.findMany({ where: { status: "PENDENTE", createdAt: { lt: new Date(Date.now() - 3 * DAY) } }, take: 500 });
  if (old.length === 0) return;

  const week = Math.floor(Date.now() / (7 * DAY));
  const kind = `PAYOUT:${week}`;
  const existing = await prisma.deliveryNotice.findMany({ where: { kind, deliveryId: { in: old.map((p) => p.deliveryId) } }, select: { transporterId: true, deliveryId: true } });
  const seen = new Set(existing.map((e) => `${e.transporterId}:${e.deliveryId}`));
  const fresh = old.filter((p) => !seen.has(`${p.transporterId}:${p.deliveryId}`));
  if (fresh.length === 0) return;

  const byPerson = new Map<string, typeof fresh>();
  fresh.forEach((p) => byPerson.set(p.transporterId, [...(byPerson.get(p.transporterId) ?? []), p]));

  await prisma.deliveryNotice.createMany({ data: fresh.map((p) => ({ transporterId: p.transporterId, deliveryId: p.deliveryId, kind })), skipDuplicates: true });
  await notify(
    Array.from(byPerson.entries()).map(([userId, list]) => ({
      userId,
      title: "Pagamentos por confirmar",
      message: `Tem ${list.length} pagamento(s) de entregas por confirmar (${Math.round(list.reduce((s, p) => s + p.netAmount, 0))} FCFA). Se já recebeu, confirme em Ganhos.`,
      relatedId: list[0].deliveryId,
    }))
  );
}

async function ordersStillOpen() {
  return prisma.delivery.count({ where: { transporterId: null } });
}

export async function runTransportNotifier() {
  if (running) return;
  running = true;
  try {
    await newLoads();
    await orderChanges();
    await payoutReminders();
  } catch (error) {
    console.error("transportNotifier", error);
  } finally {
    running = false;
  }
}

// Põe-se no server.ts depois de o servidor arrancar: startTransportNotifier()
export function startTransportNotifier(intervalMs = 5 * 60000) {
  if (timer) return;
  timer = setInterval(() => {
    runTransportNotifier();
  }, intervalMs);
  timer.unref?.();

  const first = setTimeout(() => {
    runTransportNotifier();
  }, 30000);
  first.unref?.();
}

export { ordersStillOpen };
