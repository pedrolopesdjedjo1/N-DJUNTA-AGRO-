import { randomUUID } from "crypto";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { listProducts } from "./productService";

const MAX_LINES = 30;
const DELIVERY = "Entrega ao domicílio";
const PICKUP = "Recolha no vendedor";

export const PAYMENT_OPTIONS = [
  { value: "DINHEIRO", label: "Dinheiro", hint: "Pague em dinheiro quando receber ou levantar a encomenda." },
  { value: "MOBILE_MONEY", label: "Dinheiro móvel (pelo telefone)", hint: "Pague pelo telefone e depois confirme o pagamento no app, com a referência." },
  { value: "TRANSFERENCIA", label: "Transferência bancária", hint: "Faça a transferência e depois confirme o pagamento no app, com a referência." },
];

const PAYMENT_METHODS = PAYMENT_OPTIONS.map((o) => o.value);

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function priceOf(p: any): number {
  const value = Number(p?.finalPrice ?? p?.price);
  return isNaN(value) ? 0 : value;
}

async function loadProducts() {
  const list = (await listProducts({} as any)) as any[];
  return new Map<string, any>(list.map((p) => [p.id, p]));
}

function lineProblem(p: any | undefined, quantity: number, userId: string): string | null {
  if (!p) return "Este produto já não está disponível.";
  if (p.ownerId === userId) return "Este produto é seu.";
  if (!(p.quantity > 0)) return "Sem stock.";
  if (quantity > p.quantity) return `Só há ${p.quantity} disponível(eis).`;
  return null;
}

function estimateShipping(offers: any[], origin: string, destination: string) {
  const o = plain(origin);
  const d = plain(destination);
  const match = (a: string, b: string) => a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a));

  const found = offers.filter((x) => match(plain(x.origin), o) && match(plain(x.destination), d));
  if (found.length === 0) {
    return { amount: null as number | null, source: "A_COMBINAR", offers: 0 };
  }

  const average = found.reduce((s, x) => s + Number(x.price), 0) / found.length;
  return { amount: Math.round(average), source: "OFERTAS", offers: found.length };
}

async function resolveDestination(userId: string, input: { addressId?: string; region?: string }) {
  if (input.addressId) {
    const address = await prisma.userAddress.findUnique({ where: { id: input.addressId } });
    if (address && address.userId === userId) {
      return { addressId: address.id, region: address.region ?? "" };
    }
  }
  if (input.region && input.region.trim()) {
    return { addressId: null as string | null, region: input.region.trim() };
  }

  const fallback = await prisma.userAddress.findFirst({ where: { userId, isDefault: true } });
  if (fallback) return { addressId: fallback.id, region: fallback.region ?? "" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { location: true } });
  return { addressId: null as string | null, region: user?.location ?? "" };
}

// ---------- Carrinho ----------
export async function getCart(userId: string, input: { addressId?: string; region?: string } = {}) {
  const destination = await resolveDestination(userId, input);
  const lines = await prisma.cartItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

  if (lines.length === 0) {
    return {
      destination,
      groups: [] as any[],
      itemCount: 0,
      subtotal: 0,
      shippingKnownTotal: 0,
      shippingUnknownGroups: 0,
      hasProblems: false,
    };
  }

  const [products, offers] = await Promise.all([
    loadProducts(),
    prisma.transportOffer.findMany({
      where: { isActive: true },
      select: { origin: true, destination: true, price: true },
    }),
  ]);

  const groups = new Map<string, any>();

  lines.forEach((line) => {
    const p = products.get(line.productId);
    const problem = lineProblem(p, line.quantity, userId);
    const key = p ? p.ownerId : "unavailable";

    const group =
      groups.get(key) ??
      {
        sellerId: p ? p.ownerId : null,
        seller: p
          ? {
              id: p.ownerId,
              name: p.owner?.name ?? "Vendedor",
              phone: p.owner?.phone ?? null,
              isVerified: !!p.owner?.isVerified,
              location: p.location ?? p.owner?.location ?? null,
            }
          : null,
        items: [] as any[],
        subtotal: 0,
        hasProblems: false,
      };

    const unitPrice = p ? priceOf(p) : 0;
    const lineTotal = problem ? 0 : unitPrice * line.quantity;

    group.items.push({
      productId: line.productId,
      title: p ? p.title : "Produto indisponível",
      imageUrl: p?.imageUrl ?? null,
      unit: p?.unit ?? "",
      listPrice: p ? Number(p.price) || 0 : 0,
      price: unitPrice,
      quantity: line.quantity,
      available: p ? p.quantity : 0,
      lineTotal,
      problem,
    });

    group.subtotal += lineTotal;
    if (problem) group.hasProblems = true;
    groups.set(key, group);
  });

  let subtotal = 0;
  let shippingKnownTotal = 0;
  let shippingUnknownGroups = 0;
  let hasProblems = false;

  const result = Array.from(groups.values()).map((g) => {
    const shippingEstimate = g.seller
      ? estimateShipping(offers, g.seller.location ?? "", destination.region)
      : { amount: null as number | null, source: "A_COMBINAR", offers: 0 };

    subtotal += g.subtotal;
    if (g.seller) {
      if (shippingEstimate.amount === null) shippingUnknownGroups += 1;
      else shippingKnownTotal += shippingEstimate.amount;
    }
    if (g.hasProblems) hasProblems = true;

    return { ...g, shippingEstimate };
  });

  return {
    destination,
    groups: result,
    itemCount: lines.length,
    subtotal,
    shippingKnownTotal,
    shippingUnknownGroups,
    hasProblems,
  };
}

export async function cartCount(userId: string) {
  return { count: await prisma.cartItem.count({ where: { userId } }) };
}

export async function addToCart(userId: string, productId: string, quantityInput: any) {
  const quantity = Math.floor(Number(quantityInput ?? 1));
  if (isNaN(quantity) || quantity < 1) {
    throw new Error("Quantidade inválida.");
  }

  const products = await loadProducts();
  const product = products.get(productId);
  const problem = lineProblem(product, quantity, userId);
  if (problem && !(product && quantity > product.quantity && product.quantity > 0)) {
    throw new Error(problem);
  }

  const existing = await prisma.cartItem.findFirst({ where: { userId, productId } });

  if (!existing) {
    const lines = await prisma.cartItem.count({ where: { userId } });
    if (lines >= MAX_LINES) {
      throw new Error(`O carrinho aceita até ${MAX_LINES} produtos diferentes.`);
    }
    const capped = Math.min(quantity, product.quantity);
    await prisma.cartItem.create({ data: { userId, productId, quantity: capped } });
    return getCart(userId);
  }

  if (existing.quantity >= product.quantity) {
    throw new Error("Já tem no carrinho a quantidade máxima disponível.");
  }

  await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity: Math.min(existing.quantity + quantity, product.quantity) },
  });
  return getCart(userId);
}

export async function setCartQuantity(userId: string, productId: string, quantityInput: any) {
  const existing = await prisma.cartItem.findFirst({ where: { userId, productId } });
  if (!existing) {
    throw new Error("Este produto não está no carrinho.");
  }

  const quantity = Math.floor(Number(quantityInput));
  if (isNaN(quantity)) {
    throw new Error("Quantidade inválida.");
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    return getCart(userId);
  }

  const products = await loadProducts();
  const product = products.get(productId);
  if (!product || !(product.quantity > 0)) {
    throw new Error("Este produto já não está disponível. Remova-o do carrinho.");
  }

  await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity: Math.min(quantity, product.quantity) },
  });
  return getCart(userId);
}

export async function removeFromCart(userId: string, productId: string) {
  await prisma.cartItem.deleteMany({ where: { userId, productId } });
  return getCart(userId);
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
  return getCart(userId);
}

// ---------- Encomenda ----------
export async function checkout(userId: string, input: any) {
  const method = String(input?.deliveryMethod ?? "ENTREGA");
  if (method !== "ENTREGA" && method !== "RECOLHA") {
    throw new Error("Escolha o método de entrega.");
  }

  const paymentMethod = String(input?.paymentMethod ?? "");
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error("Escolha o método de pagamento.");
  }

  // Endereço de entrega
  let deliveryAddress: string | null = null;
  let destinationRegion = "";
  if (method === "ENTREGA") {
    if (input?.addressId) {
      const address = await prisma.userAddress.findUnique({ where: { id: String(input.addressId) } });
      if (!address || address.userId !== userId) {
        throw new Error("Endereço não encontrado.");
      }
      const title = address.name || (address.label === "CASA" ? "Casa" : address.label === "TRABALHO" ? "Trabalho" : "");
      deliveryAddress = [title, address.address, address.region].filter(Boolean).join(", ");
      destinationRegion = address.region ?? "";
    } else {
      deliveryAddress = clean(input?.deliveryAddress, 250);
      destinationRegion = clean(input?.region, 80) ?? "";
    }
    if (!deliveryAddress) {
      throw new Error("Escolha ou escreva o endereço de entrega.");
    }
  }

  // Data de entrega pretendida
  let desiredDate: Date | null = null;
  if (input?.desiredDate) {
    desiredDate = new Date(input.desiredDate);
    if (isNaN(desiredDate.getTime())) {
      throw new Error("Data de entrega inválida.");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (desiredDate.getTime() < today.getTime() - 3600000) {
      throw new Error("A data de entrega não pode ser no passado.");
    }
    if (desiredDate.getTime() > today.getTime() + 60 * 86400000) {
      throw new Error("Escolha uma data de entrega nos próximos 60 dias.");
    }
  }

  const wanted: string[] | null = Array.isArray(input?.productIds) && input.productIds.length ? input.productIds.map(String) : null;
  const allLines = await prisma.cartItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const lines = wanted ? allLines.filter((l) => wanted.includes(l.productId)) : allLines;
  if (lines.length === 0) {
    throw new Error("O carrinho está vazio.");
  }

  const [products, offers, buyer] = await Promise.all([
    loadProducts(),
    method === "ENTREGA"
      ? prisma.transportOffer.findMany({ where: { isActive: true }, select: { origin: true, destination: true, price: true } })
      : Promise.resolve([] as any[]),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  // Validar cada linha e agrupar por vendedor
  const groups = new Map<string, { sellerId: string; location: string; lines: any[] }>();
  for (const line of lines) {
    const p = products.get(line.productId);
    const problem = lineProblem(p, line.quantity, userId);
    if (problem) {
      throw new Error(`${p ? `"${p.title}": ` : ""}${problem} Ajuste o carrinho e tente de novo.`);
    }

    const group = groups.get(p.ownerId) ?? { sellerId: p.ownerId, location: p.location ?? p.owner?.location ?? "", lines: [] };
    group.lines.push({ productId: p.id, title: p.title, price: priceOf(p), quantity: line.quantity });
    groups.set(p.ownerId, group);
  }

  const groupId = randomUUID();
  const notes = clean(input?.notes, 500);

  const created = await prisma.$transaction(async (tx) => {
    const orders: any[] = [];
    for (const group of groups.values()) {
      const subtotal = group.lines.reduce((s, l) => s + l.price * l.quantity, 0);
      const shipping =
        method === "ENTREGA" ? estimateShipping(offers, group.location, destinationRegion).amount ?? 0 : 0;

      const order = await tx.order.create({
        data: {
          buyerId: userId,
          sellerId: group.sellerId,
          status: OrderStatus.NOVO,
          total: subtotal,
          deliveryOption: method === "ENTREGA" ? DELIVERY : PICKUP,
          deliveryAddress,
          notes,
          desiredDate,
          paymentMethod,
          shippingCost: shipping,
          groupId,
          items: { create: group.lines.map((l) => ({ productId: l.productId, title: l.title, price: l.price, quantity: l.quantity })) },
        } as any,
        include: { items: true },
      });
      orders.push(order);
    }

    await tx.cartItem.deleteMany({ where: { userId, productId: { in: lines.map((l) => l.productId) } } });
    return orders;
  });

  await prisma.notification.createMany({
    data: created.map((o: any) => ({
      userId: o.sellerId,
      type: "SISTEMA" as const,
      title: "Novo pedido",
      message: `${buyer?.name ?? "Um cliente"} fez um pedido de ${Math.round(o.total)} FCFA.`,
      relatedId: o.id,
    })),
  });

  const orders = created.map((o: any) => ({
    id: o.id,
    sellerId: o.sellerId,
    subtotal: o.total,
    shippingCost: o.shippingCost ?? 0,
    total: o.total + (o.shippingCost ?? 0),
    itemCount: o.items.length,
  }));

  return {
    groupId,
    orders,
    subtotal: orders.reduce((s: number, o: any) => s + o.subtotal, 0),
    shippingCost: orders.reduce((s: number, o: any) => s + o.shippingCost, 0),
    total: orders.reduce((s: number, o: any) => s + o.total, 0),
    paymentMethod,
    deliveryMethod: method,
  };
}
