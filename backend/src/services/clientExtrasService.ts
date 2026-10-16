import { prisma } from "../lib/prisma";
import { searchProducts } from "./clientService";
import { getCart } from "./cartService";

const PAYMENT_KINDS = ["DINHEIRO", "MOBILE_MONEY", "TRANSFERENCIA"];
const KIND_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  MOBILE_MONEY: "Dinheiro móvel",
  TRANSFERENCIA: "Transferência bancária",
};
const MAX_METHODS = 5;
const CURRENT = ["NOVO", "ACEITO", "EM_PREPARACAO", "PRONTO", "ENVIADO"];

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function money(value: number) {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

function validUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

// ---------- Ofertas próximas ----------
export async function nearbyOffers(userId: string, regionInput?: string) {
  const result = await searchProducts(userId, {
    onlyPromo: true,
    near: true,
    region: regionInput,
    sort: "sold",
    limit: 30,
  });

  if (!result.region) {
    return { region: "", items: [], notified: 0 };
  }

  const settings: any = await prisma.userSettings.findUnique({ where: { userId } });
  const allowed = settings ? settings.notifyOpportunities !== false : true;

  let notified = 0;
  if (allowed && result.items.length > 0) {
    const recent = await prisma.notification.count({
      where: {
        userId,
        title: "Oferta perto de si",
        createdAt: { gte: new Date(Date.now() - 6 * 3600000) },
      },
    });

    if (recent === 0) {
      const ids = result.items.map((i) => i.id);
      const seen = await prisma.offerNotice.findMany({
        where: { userId, productId: { in: ids } },
        select: { productId: true },
      });
      const seenSet = new Set(seen.map((s) => s.productId));
      const fresh = result.items.filter((i) => !seenSet.has(i.id)).slice(0, 5);

      if (fresh.length > 0) {
        await prisma.offerNotice.createMany({
          data: fresh.map((i) => ({ userId, productId: i.id })),
          skipDuplicates: true,
        });
        await prisma.notification.createMany({
          data: fresh.map((i) => ({
            userId,
            type: "SISTEMA" as const,
            title: "Oferta perto de si",
            message: `${i.title}: -${i.discountPercent}% (${money(i.finalPrice)})`,
            relatedId: i.id,
          })),
        });
        notified = fresh.length;
      }
    }
  }

  return { region: result.region, items: result.items, notified };
}

// ---------- Métodos de pagamento guardados ----------
export async function listPaymentMethods(userId: string) {
  return prisma.paymentMethod.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function createPaymentMethod(userId: string, input: any) {
  const kind = String(input?.kind ?? "");
  if (!PAYMENT_KINDS.includes(kind)) {
    throw new Error("Escolha o tipo de pagamento.");
  }

  const count = await prisma.paymentMethod.count({ where: { userId } });
  if (count >= MAX_METHODS) {
    throw new Error(`Pode guardar até ${MAX_METHODS} métodos. Apague algum para criar outro.`);
  }

  const label = clean(input?.label, 40) ?? KIND_LABEL[kind];

  let phone: string | null = null;
  if (kind === "MOBILE_MONEY") {
    phone = clean(input?.phone, 20);
    if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
      throw new Error("Número de telefone inválido.");
    }
  }

  const isDefault = count === 0 || input?.isDefault === true;

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.paymentMethod.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.paymentMethod.create({ data: { userId, kind, label, phone, isDefault } });
  });
}

export async function updatePaymentMethod(userId: string, id: string, input: any) {
  const found = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Método de pagamento não encontrado.");
  }

  const data: any = {};
  if (input?.label !== undefined) data.label = clean(input.label, 40) ?? KIND_LABEL[found.kind];
  if (input?.phone !== undefined && found.kind === "MOBILE_MONEY") {
    const phone = clean(input.phone, 20);
    if (phone && !/^[+\d][\d\s-]{5,19}$/.test(phone)) {
      throw new Error("Número de telefone inválido.");
    }
    data.phone = phone;
  }

  if (input?.isDefault === true && !found.isDefault) {
    const [, updated] = await prisma.$transaction([
      prisma.paymentMethod.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
      prisma.paymentMethod.update({ where: { id }, data: { ...data, isDefault: true } }),
    ]);
    return updated;
  }

  return prisma.paymentMethod.update({ where: { id }, data });
}

export async function deletePaymentMethod(userId: string, id: string) {
  const found = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Método de pagamento não encontrado.");
  }

  await prisma.paymentMethod.delete({ where: { id } });

  if (found.isDefault) {
    const next = await prisma.paymentMethod.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (next) {
      await prisma.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return { id, deleted: true };
}

// ---------- Perfil do cliente ----------
export async function getClientProfile(userId: string) {
  const [user, orders, current, completed, favProducts, favSellers, reviews, addresses, methods, unread, cart] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true, createdAt: true, photoUrl: true },
      }),
      prisma.order.count({ where: { buyerId: userId } }),
      prisma.order.count({ where: { buyerId: userId, status: { in: CURRENT as any } } }),
      prisma.order.count({ where: { buyerId: userId, status: "CONCLUIDO" } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.favoriteSeller.count({ where: { userId } }),
      prisma.orderReview.count({ where: { authorId: userId } }),
      prisma.userAddress.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
      prisma.paymentMethod.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.cartItem.count({ where: { userId } }),
    ]);

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  return {
    user,
    stats: {
      orders,
      currentOrders: current,
      completedOrders: completed,
      favoriteProducts: favProducts,
      favoriteSellers: favSellers,
      reviewsGiven: reviews,
      cartItems: cart,
      unreadNotifications: unread,
    },
    addresses,
    defaultAddress: addresses.find((a) => a.isDefault) ?? null,
    paymentMethods: methods,
    defaultPaymentMethod: methods.find((m) => m.isDefault) ?? null,
  };
}

export async function updateClientProfile(userId: string, input: any) {
  const data: any = {};

  if (input?.name !== undefined) {
    const name = clean(input.name, 120);
    if (!name || name.length < 2) {
      throw new Error("Escreva o seu nome.");
    }
    data.name = name;
  }

  if (input?.photoUrl !== undefined) {
    if (input.photoUrl === null || input.photoUrl === "") {
      data.photoUrl = null;
    } else if (validUrl(input.photoUrl)) {
      data.photoUrl = input.photoUrl;
    } else {
      throw new Error("Foto inválida.");
    }
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  await prisma.user.update({ where: { id: userId }, data });
  return getClientProfile(userId);
}

// Resumo leve para a barra do carrinho e do perfil
export async function badges(userId: string) {
  const [cart, unread, current] = await Promise.all([
    prisma.cartItem.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.order.count({ where: { buyerId: userId, status: { in: CURRENT as any } } }),
  ]);
  return { cart, unreadNotifications: unread, currentOrders: current };
}

export { getCart };
