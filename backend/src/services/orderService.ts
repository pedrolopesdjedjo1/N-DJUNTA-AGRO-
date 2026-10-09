import { DeliveryStatus, OrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";

const include = { items: true, delivery: true };

const SELLER_FLOW: Record<string, string[]> = {
  NOVO: ["ACEITO", "CANCELADO"],
  ACEITO: ["EM_PREPARACAO", "CANCELADO"],
  EM_PREPARACAO: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["CONCLUIDO"],
};

const BUYER_FLOW: Record<string, string[]> = {
  NOVO: ["CANCELADO"],
  ENVIADO: ["CONCLUIDO"],
};

const TRANSPORTER_FLOW: Record<string, string[]> = {
  SOLICITADA: ["ACEITA", "CANCELADA"],
  ACEITA: ["RECOLHIDA"],
  RECOLHIDA: ["EM_TRANSITO"],
  EM_TRANSITO: ["ENTREGUE"],
};

const SELLER_DELIVERY_FLOW: Record<string, string[]> = {
  SOLICITADA: ["CANCELADA"],
  ACEITA: ["CANCELADA"],
  RECOLHIDA: ["ENTREGUE"],
  EM_TRANSITO: ["ENTREGUE"],
};

async function notify(userId: string, title: string, message: string, relatedId?: string) {
  await prisma.notification.create({
    data: { userId, type: "SISTEMA", title, message, relatedId },
  });
}

async function decorate(orders: any[]) {
  const ids: string[] = [];
  orders.forEach((o) => {
    ids.push(o.buyerId, o.sellerId);
    if (o.delivery?.transporterId) ids.push(o.delivery.transporterId);
  });
  const users = await usersByIds(ids);

  return orders.map((o) => ({
    ...o,
    buyer: users.get(o.buyerId) ?? null,
    seller: users.get(o.sellerId) ?? null,
    delivery: o.delivery
      ? {
          ...o.delivery,
          transporter: o.delivery.transporterId ? users.get(o.delivery.transporterId) ?? null : null,
        }
      : null,
  }));
}

interface CreateOrderInput {
  buyerId: string;
  items: { productId: string; quantity: number }[];
  deliveryOption?: string;
  deliveryAddress?: string;
  notes?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const wanted = new Map<string, number>();
  for (const item of input.items ?? []) {
    const qty = Math.floor(Number(item.quantity));
    if (!item.productId || !qty || qty < 1) {
      throw new Error("Produto ou quantidade inválidos.");
    }
    wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + qty);
  }
  if (wanted.size === 0) {
    throw new Error("Escolha pelo menos um produto.");
  }

  const ids = Array.from(wanted.keys());
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) {
    throw new Error("Algum produto não foi encontrado.");
  }

  const sellerId = products[0].ownerId;
  if (products.some((p) => p.ownerId !== sellerId)) {
    throw new Error("Cada pedido deve ter produtos de um só vendedor.");
  }
  if (sellerId === input.buyerId) {
    throw new Error("Você não pode comprar os seus próprios produtos.");
  }

  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      productId: { in: ids },
      isActive: true,
      discountPercent: { not: null },
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
  });

  let total = 0;
  const lines = products.map((product) => {
    const qty = wanted.get(product.id) as number;
    if (!product.isAvailable || product.quantity < qty) {
      throw new Error(`${product.title}: quantidade indisponível.`);
    }
    const discount = Math.max(
      0,
      ...promos.filter((p) => p.productId === product.id).map((p) => p.discountPercent ?? 0)
    );
    const price = Math.round(product.price * (1 - discount / 100));
    total += price * qty;
    return { productId: product.id, title: product.title, price, quantity: qty };
  });

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        buyerId: input.buyerId,
        sellerId,
        total,
        deliveryOption: input.deliveryOption,
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        items: { create: lines },
      },
      include,
    });

    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { quantity: { decrement: line.quantity } },
      });
    }
    await tx.product.updateMany({
      where: { id: { in: ids }, quantity: { lte: 0 } },
      data: { isAvailable: false },
    });

    return created;
  });

  const [full] = await decorate([order]);
  await notify(
    sellerId,
    "Novo pedido",
    `${full.buyer?.name ?? "Um cliente"} fez um pedido de ${total} FCFA.`,
    order.id
  );
  return full;
}

export async function listOrders(userId: string, as: string, status?: string) {
  const where: any = as === "buyer" ? { buyerId: userId } : { sellerId: userId };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({ where, include, orderBy: { createdAt: "desc" } });
  return decorate(orders);
}

export async function getOrder(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include });
  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  const allowed =
    order.buyerId === userId || order.sellerId === userId || order.delivery?.transporterId === userId;
  if (!allowed) {
    throw new Error("Você não tem permissão para ver este pedido.");
  }

  const [full] = await decorate([order]);
  return full;
}

export async function updateOrderStatus(orderId: string, userId: string, status: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  const isSeller = order.sellerId === userId;
  const isBuyer = order.buyerId === userId;
  if (!isSeller && !isBuyer) {
    throw new Error("Você não tem permissão para alterar este pedido.");
  }

  const allowed = (isSeller ? SELLER_FLOW : BUYER_FLOW)[order.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error("Esta mudança de estado não é permitida.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
      include,
    });

    if (status === "CANCELADO") {
      for (const item of order.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity }, isAvailable: true },
        });
      }
    }
    return result;
  });

  const otherId = isSeller ? order.buyerId : order.sellerId;
  await notify(otherId, "Pedido atualizado", `O pedido passou para: ${status}.`, orderId);

  const [full] = await decorate([updated]);
  return full;
}

export async function setPaid(orderId: string, sellerId: string, paid: boolean) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.sellerId !== sellerId) {
    throw new Error("Pedido não encontrado.");
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data: { paid }, include });
  const [full] = await decorate([updated]);
  return full;
}

export async function listTransporters() {
  return prisma.user.findMany({
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
}

interface DeliveryInput {
  transporterId: string;
  offerId?: string;
  price?: number;
  pickupAt?: string;
}

export async function requestDelivery(orderId: string, sellerId: string, input: DeliveryInput) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.sellerId !== sellerId) {
    throw new Error("Pedido não encontrado.");
  }
  if (!["ACEITO", "EM_PREPARACAO", "ENVIADO"].includes(order.status)) {
    throw new Error("Só dá para pedir transporte de um pedido aceite.");
  }

  const transporter = await prisma.user.findFirst({
    where: { id: input.transporterId, role: "TRANSPORTADOR", isActive: true },
  });
  if (!transporter) {
    throw new Error("Transportador não encontrado.");
  }

  let price = input.price !== undefined ? Number(input.price) : undefined;
  if (input.offerId) {
    const offer = await prisma.transportOffer.findFirst({
      where: { id: input.offerId, transporterId: input.transporterId, isActive: true },
    });
    if (!offer) {
      throw new Error("Oferta de transporte não encontrada.");
    }
    price = offer.price;
  }
  if (price !== undefined && (isNaN(price) || price < 0)) {
    throw new Error("Preço inválido.");
  }

  let pickupAt: Date | undefined;
  if (input.pickupAt) {
    pickupAt = new Date(input.pickupAt);
    if (isNaN(pickupAt.getTime())) {
      throw new Error("Data de recolha inválida.");
    }
  }

  const existing = await prisma.delivery.findUnique({ where: { orderId } });
  if (existing && existing.status !== "CANCELADA") {
    throw new Error("Este pedido já tem uma entrega solicitada.");
  }

  const data = {
    transporterId: input.transporterId,
    offerId: input.offerId,
    price,
    pickupAt,
    status: "SOLICITADA" as DeliveryStatus,
  };

  const delivery = existing
    ? await prisma.delivery.update({ where: { orderId }, data })
    : await prisma.delivery.create({ data: { orderId, ...data } });

  await notify(
    input.transporterId,
    "Nova entrega",
    "Um comerciante pediu a sua entrega. Abra Entregas para responder.",
    delivery.id
  );

  return delivery;
}

export async function listDeliveries(userId: string) {
  const deliveries = await prisma.delivery.findMany({
    where: { OR: [{ transporterId: userId }, { order: { sellerId: userId } }] },
    include: { order: { include: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ids: string[] = [];
  deliveries.forEach((d) => {
    ids.push(d.order.buyerId, d.order.sellerId);
    if (d.transporterId) ids.push(d.transporterId);
  });
  const users = await usersByIds(ids);

  return deliveries.map((d) => ({
    ...d,
    buyer: users.get(d.order.buyerId) ?? null,
    seller: users.get(d.order.sellerId) ?? null,
    transporter: d.transporterId ? users.get(d.transporterId) ?? null : null,
  }));
}

export async function updateDeliveryStatus(deliveryId: string, userId: string, status: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true },
  });
  if (!delivery) {
    throw new Error("Entrega não encontrada.");
  }

  const isTransporter = delivery.transporterId === userId;
  const isSeller = delivery.order.sellerId === userId;
  if (!isTransporter && !isSeller) {
    throw new Error("Você não tem permissão para alterar esta entrega.");
  }

  const flow = isTransporter ? TRANSPORTER_FLOW : SELLER_DELIVERY_FLOW;
  const allowed = flow[delivery.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error("Esta mudança de estado não é permitida.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.delivery.update({
      where: { id: deliveryId },
      data: { status: status as DeliveryStatus },
    });
    if (status === "ENTREGUE") {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: OrderStatus.CONCLUIDO } });
    }
    return result;
  });

  const otherId = isTransporter ? delivery.order.sellerId : delivery.transporterId;
  if (otherId) {
    await notify(otherId, "Entrega atualizada", `A entrega passou para: ${status}.`, deliveryId);
  }

  return updated;
}
