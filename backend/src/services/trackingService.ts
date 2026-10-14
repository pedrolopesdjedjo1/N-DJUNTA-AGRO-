import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const TRACKABLE = ["ACEITA", "RECOLHIDA", "EM_TRANSITO"];

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function setLocation(deliveryId: string, userId: string, input: any) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.transporterId !== userId) {
    throw new Error("Entrega não encontrada.");
  }
  if (!TRACKABLE.includes(delivery.status)) {
    throw new Error("Só dá para partilhar a localização de uma entrega em curso.");
  }

  const lat = input?.lat !== undefined && input.lat !== null && input.lat !== "" ? Number(input.lat) : null;
  const lng = input?.lng !== undefined && input.lng !== null && input.lng !== "" ? Number(input.lng) : null;
  if ((lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) || (lng !== null && (isNaN(lng) || lng < -180 || lng > 180))) {
    throw new Error("Coordenadas inválidas.");
  }

  const text = clean(input?.location, 200);
  if (!text && (lat === null || lng === null)) {
    throw new Error("Informe o local onde você está.");
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { lastLocation: text, lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
  });
}

export async function getTracking(deliveryId: string, userId: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: { select: { id: true, sellerId: true, buyerId: true, total: true, deliveryAddress: true } } },
  });
  if (!delivery) {
    throw new Error("Entrega não encontrada.");
  }

  const allowed =
    delivery.transporterId === userId || delivery.order.sellerId === userId || delivery.order.buyerId === userId;
  if (!allowed) {
    throw new Error("Você não tem permissão para ver esta entrega.");
  }

  const users = await usersByIds(delivery.transporterId ? [delivery.transporterId] : []);
  const transporter = delivery.transporterId ? users.get(delivery.transporterId) : null;

  return {
    id: delivery.id,
    status: delivery.status,
    price: delivery.price,
    pickupAt: delivery.pickupAt,
    lastLocation: delivery.lastLocation,
    lastLat: delivery.lastLat,
    lastLng: delivery.lastLng,
    lastLocationAt: delivery.lastLocationAt,
    order: delivery.order,
    transporter: transporter ? { id: transporter.id, name: transporter.name, phone: transporter.phone } : null,
  };
}

export async function nearbyTransporters(near?: string) {
  const transporters = await prisma.user.findMany({
    where: { role: "TRANSPORTADOR", isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      location: true,
      isVerified: true,
      transportOffers: {
        where: { isActive: true },
        select: {
          id: true,
          origin: true,
          destination: true,
          capacity: true,
          price: true,
          availableDate: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const key = (near ?? "").trim().toLowerCase();
  const list = transporters.map((t) => {
    const place = `${t.location ?? ""} ${t.transportOffers.map((o) => o.origin).join(" ")}`.toLowerCase();
    return { ...t, isNear: key ? place.includes(key) : false };
  });

  return list.sort((a, b) => Number(b.isNear) - Number(a.isNear));
}
