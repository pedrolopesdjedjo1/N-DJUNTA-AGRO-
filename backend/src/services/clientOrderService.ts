import { prisma } from "../lib/prisma";
import { usersByIds } from "../lib/userLookup";
import { PAYMENT_OPTIONS } from "./cartService";

const PICKUP = "Recolha no vendedor";
const CURRENT = ["NOVO", "ACEITO", "EM_PREPARACAO", "PRONTO", "ENVIADO"];
const DECLARABLE = ["MOBILE_MONEY", "TRANSFERENCIA"];
const PAYMENT_METHODS = PAYMENT_OPTIONS.map((o) => o.value);
const PAYMENT_LABEL: Record<string, string> = {};
PAYMENT_OPTIONS.forEach((o) => {
  PAYMENT_LABEL[o.value] = o.label;
});

const DELIVERY_STEPS = [
  ["RECEBIDO", "Pedido recebido"],
  ["CONFIRMADO", "Confirmado"],
  ["EM_PREPARACAO", "Em preparação"],
  ["RECOLHIDO", "Recolhido"],
  ["EM_TRANSPORTE", "Em transporte"],
  ["A_CAMINHO", "A caminho"],
  ["ENTREGUE", "Entregue"],
];

const PICKUP_STEPS = [
  ["RECEBIDO", "Pedido recebido"],
  ["CONFIRMADO", "Confirmado"],
  ["EM_PREPARACAO", "Em preparação"],
  ["PRONTO", "Pronto para levantar"],
  ["ENTREGUE", "Levantado"],
];

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function validUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

function money(value: number) {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

function dateText(value: any) {
  const d = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function orderNumber(order: any) {
  const d = new Date(order.createdAt);
  const p = (n: number) => String(n).padStart(2, "0");
  return `NA-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${String(order.id).slice(0, 6).toUpperCase()}`;
}

function isPickup(order: any) {
  return order.deliveryOption === PICKUP;
}

async function notify(userId: string, title: string, message: string, relatedId: string) {
  await prisma.notification.create({
    data: { userId, type: "SISTEMA", title, message, relatedId },
  });
}

// ---------- Contexto (entregas, pagamentos, nomes) ----------
interface Ctx {
  deliveries: Map<string, any>;
  declarations: Map<string, any[]>;
  users: Map<string, any>;
}

async function buildContext(orders: any[]): Promise<Ctx> {
  const ids = orders.map((o) => o.id);

  const [deliveries, payments] =
    ids.length > 0
      ? await Promise.all([
          prisma.delivery.findMany({ where: { orderId: { in: ids } } }),
          prisma.orderPayment.findMany({ where: { orderId: { in: ids } }, orderBy: { createdAt: "asc" } }),
        ])
      : [[], []];

  const deliveryMap = new Map<string, any>();
  [...(deliveries as any[])]
    .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
    .forEach((d) => {
      const current = deliveryMap.get(d.orderId);
      if (!current || d.status !== "CANCELADA" || current.status === "CANCELADA") {
        deliveryMap.set(d.orderId, d);
      }
    });

  const declarations = new Map<string, any[]>();
  (payments as any[]).forEach((p) => declarations.set(p.orderId, [...(declarations.get(p.orderId) ?? []), p]));

  const userIds = Array.from(
    new Set([
      ...orders.map((o) => o.sellerId),
      ...Array.from(deliveryMap.values()).map((d) => d.transporterId),
    ].filter(Boolean))
  ) as string[];

  return { deliveries: deliveryMap, declarations, users: await usersByIds(userIds) };
}

function buildSteps(order: any, delivery: any) {
  const pickup = isPickup(order);
  const defs = pickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const steps = defs.map(([key, label]) => ({ key, label }));

  if (order.status === "CANCELADO") return { steps, current: -1, cancelled: true };

  const base: Record<string, number> = pickup
    ? { NOVO: 0, ACEITO: 1, EM_PREPARACAO: 2, PRONTO: 3, ENVIADO: 3, CONCLUIDO: 4 }
    : { NOVO: 0, ACEITO: 1, EM_PREPARACAO: 2, PRONTO: 2, ENVIADO: 4, CONCLUIDO: 6 };
  let current = base[order.status] ?? 0;

  if (!pickup && delivery) {
    const recent =
      delivery.lastLocationAt && Date.now() - new Date(delivery.lastLocationAt).getTime() < 30 * 60000;
    const byDelivery: Record<string, number> = { RECOLHIDA: 3, EM_TRANSITO: recent ? 5 : 4, ENTREGUE: 6 };
    current = Math.max(current, byDelivery[delivery.status] ?? 0);
  }

  return { steps, current, cancelled: false };
}

function shape(order: any, ctx: Ctx) {
  const delivery = ctx.deliveries.get(order.id) ?? null;
  const declarations = ctx.declarations.get(order.id) ?? [];
  const pickup = isPickup(order);

  const agreed =
    delivery && delivery.status !== "CANCELADA" && delivery.price !== null && delivery.price !== undefined;
  const shipping = pickup ? 0 : agreed ? Number(delivery.price) : Number(order.shippingCost ?? 0);
  const subtotal = Number(order.total) || 0;
  const total = subtotal + shipping;

  const paymentStatus = order.paid ? "PAGO" : declarations.length > 0 ? "AGUARDA_CONFIRMACAO" : "POR_PAGAR";
  const method: string | null = order.paymentMethod ?? null;

  const seller = ctx.users.get(order.sellerId);
  const transporter = delivery?.transporterId ? ctx.users.get(delivery.transporterId) : null;

  const deliveredByCarrier = delivery?.status === "ENTREGUE" && !["CONCLUIDO", "CANCELADO"].includes(order.status);
  const canConfirmReceipt =
    order.status === "ENVIADO" || (pickup && order.status === "PRONTO") || deliveredByCarrier;

  return {
    id: order.id,
    groupId: order.groupId ?? order.id,
    number: orderNumber(order),
    createdAt: order.createdAt,
    status: order.status,
    paid: !!order.paid,
    isPickup: pickup,
    seller: { id: order.sellerId, name: seller?.name ?? "Vendedor", phone: seller?.phone ?? null },
    items: (order.items ?? []).map((i: any) => ({
      id: i.id,
      productId: i.productId,
      title: i.title,
      quantity: i.quantity,
      price: i.price,
      lineTotal: i.price * i.quantity,
    })),
    subtotal,
    shipping,
    shippingAgreed: !!agreed,
    total,
    deliveryOption: order.deliveryOption ?? null,
    deliveryAddress: order.deliveryAddress ?? null,
    notes: order.notes ?? null,
    desiredDate: order.desiredDate ?? null,
    paymentMethod: method,
    paymentMethodLabel: method ? PAYMENT_LABEL[method] ?? method : null,
    paymentStatus,
    declarations: declarations.map((d) => ({
      id: d.id,
      method: d.method,
      amount: d.amount,
      reference: d.reference,
      createdAt: d.createdAt,
    })),
    delivery: delivery
      ? {
          id: delivery.id,
          status: delivery.status,
          price: delivery.price ?? null,
          pickupAt: delivery.pickupAt ?? null,
          lastLocation: delivery.lastLocation ?? null,
          lastLat: delivery.lastLat ?? null,
          lastLng: delivery.lastLng ?? null,
          lastLocationAt: delivery.lastLocationAt ?? null,
        }
      : null,
    transporter: transporter
      ? { id: delivery.transporterId, name: transporter.name, phone: transporter.phone ?? null }
      : null,
    tracking: buildSteps(order, delivery),
    actions: {
      canPay:
        !order.paid &&
        order.status !== "CANCELADO" &&
        !!method &&
        DECLARABLE.includes(method) &&
        declarations.length < 3,
      canChangeMethod: !order.paid && order.status !== "CANCELADO",
      canConfirmReceipt,
      canCancel: order.status === "NOVO",
      canReview: order.status === "CONCLUIDO",
      hasReceipt: !!order.paid || order.status === "CONCLUIDO",
    },
  };
}

async function loadOwn(userId: string, id: string) {
  const order: any = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.buyerId !== userId) {
    throw new Error("Encomenda não encontrada.");
  }
  return order;
}

// ---------- Minhas encomendas ----------
export async function listOrders(userId: string, tab?: string) {
  const where: any = { buyerId: userId };
  if (tab === "current") where.status = { in: CURRENT };
  if (tab === "completed") where.status = "CONCLUIDO";
  if (tab === "cancelled") where.status = "CANCELADO";

  const orders: any[] = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const ctx = await buildContext(orders);
  const shaped = orders.map((o) => shape(o, ctx));

  const groups = new Map<string, any>();
  shaped.forEach((o) => {
    const group = groups.get(o.groupId) ?? { groupId: o.groupId, createdAt: o.createdAt, orders: [] as any[], total: 0 };
    group.orders.push(o);
    group.total += o.total;
    groups.set(o.groupId, group);
  });

  return { count: shaped.length, groups: Array.from(groups.values()) };
}

export async function getOrderDetail(userId: string, id: string) {
  const order = await loadOwn(userId, id);
  const ctx = await buildContext([order]);
  const detail = shape(order, ctx);

  return { ...detail, reviewables: await reviewables(userId, id) };
}

export async function cancelOrder(userId: string, id: string) {
  const order = await loadOwn(userId, id);
  if (order.status !== "NOVO") {
    throw new Error("Só pode cancelar um pedido que o vendedor ainda não aceitou. Fale com o vendedor.");
  }

  await prisma.order.update({ where: { id }, data: { status: "CANCELADO" } });
  await notify(order.sellerId, "Pedido cancelado", `O cliente cancelou o pedido ${orderNumber(order)}.`, id);
  return getOrderDetail(userId, id);
}

export async function confirmReceived(userId: string, id: string) {
  const order = await loadOwn(userId, id);
  const ctx = await buildContext([order]);
  const detail = shape(order, ctx);

  if (!detail.actions.canConfirmReceipt) {
    throw new Error("Ainda não pode confirmar o recebimento desta encomenda.");
  }

  const delivery = ctx.deliveries.get(id);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "CONCLUIDO", buyerConfirmedAt: new Date() } as any,
    });
    if (delivery && ["ACEITA", "RECOLHIDA", "EM_TRANSITO"].includes(delivery.status)) {
      await tx.delivery.update({ where: { id: delivery.id }, data: { status: "ENTREGUE" } });
    }
  });

  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(
    order.sellerId,
    "Encomenda recebida",
    `${buyer?.name ?? "O cliente"} confirmou o recebimento do pedido ${orderNumber(order)}.`,
    id
  );
  if (delivery?.transporterId) {
    await notify(delivery.transporterId, "Entrega confirmada", `O cliente confirmou a entrega do pedido ${orderNumber(order)}.`, id);
  }

  return getOrderDetail(userId, id);
}

// ---------- Pagamento ----------
export async function changePaymentMethod(userId: string, id: string, methodInput: any) {
  const order = await loadOwn(userId, id);
  if (order.paid) {
    throw new Error("Esta encomenda já está paga.");
  }
  if (order.status === "CANCELADO") {
    throw new Error("Esta encomenda foi cancelada.");
  }

  const method = String(methodInput ?? "");
  if (!PAYMENT_METHODS.includes(method)) {
    throw new Error("Método de pagamento inválido.");
  }

  await prisma.order.update({ where: { id }, data: { paymentMethod: method } as any });
  return getOrderDetail(userId, id);
}

export async function declarePayment(userId: string, id: string, input: any) {
  const order = await loadOwn(userId, id);
  if (order.paid) {
    throw new Error("Esta encomenda já está paga.");
  }
  if (order.status === "CANCELADO") {
    throw new Error("Esta encomenda foi cancelada.");
  }

  let method: string = order.paymentMethod ?? "";
  if (input?.method) {
    method = String(input.method);
    if (!PAYMENT_METHODS.includes(method)) {
      throw new Error("Método de pagamento inválido.");
    }
  }
  if (!DECLARABLE.includes(method)) {
    throw new Error("O pagamento em dinheiro é feito diretamente ao vendedor, na entrega ou na recolha.");
  }

  const reference = clean(input?.reference, 60);
  if (!reference || reference.length < 3) {
    throw new Error("Escreva a referência ou o número da operação.");
  }
  const phone = clean(input?.phone, 20);

  const ctx = await buildContext([order]);
  const detail = shape(order, ctx);
  if (detail.declarations.length >= 3) {
    throw new Error("Já informou o pagamento três vezes. Fale com o vendedor ou com o suporte.");
  }

  await prisma.orderPayment.create({
    data: { orderId: id, buyerId: userId, method, amount: detail.total, reference, phone },
  });
  if (method !== order.paymentMethod) {
    await prisma.order.update({ where: { id }, data: { paymentMethod: method } as any });
  }

  const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(
    order.sellerId,
    "Pagamento a confirmar",
    `${buyer?.name ?? "O cliente"} informou o pagamento do pedido ${orderNumber(order)}: ${money(detail.total)} (ref. ${reference}). Confirme em Pedidos, Marcar pago.`,
    id
  );

  return getOrderDetail(userId, id);
}

export async function listPayments(userId: string) {
  const orders: any[] = await prisma.order.findMany({
    where: { buyerId: userId, status: { not: "CANCELADO" } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const ctx = await buildContext(orders);
  const shaped = orders.map((o) => shape(o, ctx));

  const summary = (o: any) => ({
    orderId: o.id,
    number: o.number,
    createdAt: o.createdAt,
    seller: o.seller,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentMethodLabel: o.paymentMethodLabel,
    paymentStatus: o.paymentStatus,
    declarations: o.declarations,
    hasReceipt: o.actions.hasReceipt,
    canPay: o.actions.canPay,
  });

  return {
    pending: shaped.filter((o) => o.paymentStatus !== "PAGO").map(summary),
    history: shaped.filter((o) => o.paymentStatus === "PAGO").map(summary),
    totalPaid: shaped.filter((o) => o.paymentStatus === "PAGO").reduce((s, o) => s + o.total, 0),
  };
}

// ---------- Recibo ----------
export async function getReceipt(userId: string, id: string) {
  const order = await loadOwn(userId, id);
  const ctx = await buildContext([order]);
  const detail = shape(order, ctx);

  if (!detail.actions.hasReceipt) {
    throw new Error("O recibo fica disponível depois do pagamento ou da entrega.");
  }

  const [buyer, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } }),
    prisma.user.findUnique({ where: { id: order.sellerId }, select: { name: true, phone: true, location: true } }),
  ]);

  const lines = [
    "RECIBO NÔDJUNTA AGRO",
    `Nº ${detail.number}`,
    `Data da encomenda: ${dateText(order.createdAt)}`,
    `Emitido em: ${dateText(new Date())}`,
    "",
    `Cliente: ${buyer?.name ?? ""}${buyer?.phone ? ` (${buyer.phone})` : ""}`,
    `Vendedor: ${seller?.name ?? ""}${seller?.phone ? ` (${seller.phone})` : ""}`,
    "",
    ...detail.items.map((i: any) => `${i.quantity} × ${i.title} — ${money(i.lineTotal)}`),
    "",
    `Subtotal: ${money(detail.subtotal)}`,
    `${detail.isPickup ? "Recolha" : "Entrega"}: ${money(detail.shipping)}`,
    `TOTAL: ${money(detail.total)}`,
    "",
    `Pagamento: ${detail.paymentMethodLabel ?? "—"} (${
      detail.paymentStatus === "PAGO" ? "pago" : detail.paymentStatus === "AGUARDA_CONFIRMACAO" ? "a aguardar confirmação" : "por pagar"
    })`,
  ];

  return {
    number: detail.number,
    createdAt: order.createdAt,
    issuedAt: new Date().toISOString(),
    buyer,
    seller,
    items: detail.items,
    subtotal: detail.subtotal,
    shipping: detail.shipping,
    total: detail.total,
    isPickup: detail.isPickup,
    paymentMethodLabel: detail.paymentMethodLabel,
    paymentStatus: detail.paymentStatus,
    deliveryAddress: detail.deliveryAddress,
    text: lines.join("\n"),
  };
}

// ---------- Avaliações ----------
async function reviewables(userId: string, orderId: string) {
  const order = await loadOwn(userId, orderId);
  const ctx = await buildContext([order]);
  const delivery = ctx.deliveries.get(orderId);

  const done: any[] = await prisma.orderReview.findMany({ where: { orderId, authorId: userId } });
  const has = (kind: string, productId?: string) =>
    done.some((r) => r.kind === kind && (productId === undefined || r.productId === productId));

  const seller = ctx.users.get(order.sellerId);
  const transporter = delivery?.transporterId ? ctx.users.get(delivery.transporterId) : null;

  return {
    canReview: order.status === "CONCLUIDO",
    products: (order.items ?? []).map((i: any) => ({
      productId: i.productId,
      title: i.title,
      reviewed: has("PRODUTO", i.productId),
    })),
    seller: { id: order.sellerId, name: seller?.name ?? "Vendedor", reviewed: has("VENDEDOR") },
    transporter: transporter
      ? { id: delivery.transporterId, name: transporter.name, reviewed: has("TRANSPORTADOR") }
      : null,
    mine: done.map((r) => ({
      id: r.id,
      kind: r.kind,
      productId: r.productId,
      productTitle: r.productTitle,
      rating: r.rating,
      comment: r.comment,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt,
    })),
  };
}

export async function getReviewables(userId: string, orderId: string) {
  return reviewables(userId, orderId);
}

export async function createReview(userId: string, orderId: string, input: any) {
  const order = await loadOwn(userId, orderId);
  if (order.status !== "CONCLUIDO") {
    throw new Error("Só pode avaliar depois de receber a encomenda.");
  }

  const kind = String(input?.kind ?? "");
  if (!["PRODUTO", "VENDEDOR", "TRANSPORTADOR"].includes(kind)) {
    throw new Error("Escolha o que quer avaliar.");
  }

  const rating = Math.floor(Number(input?.rating));
  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("Escolha de 1 a 5 estrelas.");
  }

  const comment = clean(input?.comment, 500);
  let imageUrl: string | null = null;
  if (input?.imageUrl) {
    if (!validUrl(input.imageUrl)) {
      throw new Error("Foto inválida.");
    }
    imageUrl = input.imageUrl;
  }

  let targetId = order.sellerId as string;
  let productId: string | null = null;
  let productTitle: string | null = null;

  if (kind === "PRODUTO") {
    const wanted = String(input?.productId ?? "");
    const item = (order.items ?? []).find((i: any) => i.productId === wanted);
    if (!item) {
      throw new Error("Este produto não faz parte da encomenda.");
    }
    productId = wanted;
    productTitle = item.title;
  } else if (kind === "TRANSPORTADOR") {
    const ctx = await buildContext([order]);
    const delivery = ctx.deliveries.get(orderId);
    if (!delivery?.transporterId) {
      throw new Error("Esta encomenda não teve transportador.");
    }
    targetId = delivery.transporterId;
  }

  const exists = await prisma.orderReview.findFirst({ where: { orderId, authorId: userId, kind, productId } });
  if (exists) {
    throw new Error("Você já fez esta avaliação.");
  }

  const review = await prisma.orderReview.create({
    data: { orderId, authorId: userId, targetId, kind, productId, productTitle, rating, comment, imageUrl },
  });

  // As avaliações de vendedor e transportador também entram na nota geral da pessoa
  if (kind !== "PRODUTO") {
    try {
      await prisma.review.create({ data: { authorId: userId, targetId, rating, comment } as any });
    } catch (e: any) {
      console.error("Avaliação não copiada para a tabela reviews:", e?.message);
    }
  }

  const author = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(
    targetId,
    "Nova avaliação",
    `${author?.name ?? "Um cliente"} deu ${rating} estrela(s)${productTitle ? ` a "${productTitle}"` : ""}.`,
    orderId
  );

  return review;
}

export async function myReviews(userId: string) {
  const rows: any[] = await prisma.orderReview.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const users = await usersByIds(Array.from(new Set(rows.map((r) => r.targetId))) as string[]);

  return rows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    kind: r.kind,
    productId: r.productId,
    productTitle: r.productTitle,
    targetName: users.get(r.targetId)?.name ?? "—",
    rating: r.rating,
    comment: r.comment,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt,
  }));
}

export async function productReviews(productId: string) {
  const rows: any[] = await prisma.orderReview.findMany({
    where: { productId, kind: "PRODUTO" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const authorIds = Array.from(new Set(rows.map((r) => r.authorId))) as string[];
  const authors = authorIds.length
    ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(authors.map((a) => [a.id, a.name]));

  const average = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;

  return {
    count: rows.length,
    average: Math.round(average * 10) / 10,
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt,
      authorName: names.get(r.authorId) ?? "Cliente",
    })),
  };
}
