import { OrderStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { listProducts, getProductById } from "./productService";

const CACHE_MS = 30 * 1000;
let CATALOG: { at: number; items: any[] } | null = null;

const DEPARTMENT_WORDS: Record<string, string> = {
  ALIMENTACAO: "alimentacao alimentos comida",
  ROUPA_MODA: "roupa moda",
  CASA: "casa",
  CONSTRUCAO: "construcao",
  TECNOLOGIA: "tecnologia",
  VEICULOS: "veiculos",
  AGRICULTURA: "agricultura agricola",
  PESCA: "pesca pescado peixe",
  ARTESANATO: "artesanato",
  OUTROS: "outros",
};

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tipoOf(p: any): string {
  return p?.details?.tipo ?? "PRODUTO";
}

function priceOf(p: any): number {
  const value = Number(p?.finalPrice ?? p?.price);
  return isNaN(value) ? 0 : value;
}

function timeOf(p: any): number {
  const t = new Date(p?.createdAt ?? 0).getTime();
  return isNaN(t) ? 0 : t;
}

function isNear(p: any, region: string): boolean {
  const r = plain(region);
  if (r.length < 3) return false;
  const places = [p.location, p.owner?.location].map(plain).filter((x) => x.length >= 3);
  return places.some((place) => place.includes(r) || r.includes(place));
}

// ---------- Categorias ----------
interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  test: (p: any, region: string) => boolean;
}

const FRUITS = ["frutas", "caju"];
const VEGETABLES = ["legumes", "hortalicas", "raizes e tuberculos"];
const CEREALS = ["cereais", "arroz", "feijao"];
const PROCESSED = ["PROCESSADO", "SALGADO", "DEFUMADO", "SECO"];
const CLASSIC = ["AGRICULTURA", "PESCA", "ARTESANATO", "ALIMENTACAO"];

export const CATEGORIES: CategoryDef[] = [
  { key: "AGRICOLA", label: "Produtos agrícolas", icon: "🌾", test: (p) => p.department === "AGRICULTURA" && tipoOf(p) === "PRODUTO" },
  { key: "PESCADO", label: "Pescado", icon: "🐟", test: (p) => p.department === "PESCA" && tipoOf(p) === "PRODUTO" },
  { key: "ARTESANATO", label: "Artesanato", icon: "🧺", test: (p) => p.department === "ARTESANATO" },
  { key: "FRUTAS", label: "Frutas", icon: "🍎", test: (p) => FRUITS.includes(plain(p.subcategory)) },
  { key: "LEGUMES", label: "Legumes", icon: "🥬", test: (p) => VEGETABLES.includes(plain(p.subcategory)) },
  { key: "CEREAIS", label: "Cereais", icon: "🌽", test: (p) => CEREALS.includes(plain(p.subcategory)) },
  { key: "TRANSFORMADOS", label: "Produtos transformados", icon: "🥜", test: (p) => PROCESSED.includes(p.details?.estadoProduto) },
  { key: "ALIMENTARES", label: "Produtos alimentares", icon: "🥩", test: (p) => p.department === "ALIMENTACAO" },
  { key: "LOCAIS", label: "Produtos locais", icon: "🧴", test: (p, region) => !!region && isNear(p, region) },
  { key: "OUTROS", label: "Outros produtos", icon: "📦", test: (p) => !CLASSIC.includes(p.department) || tipoOf(p) !== "PRODUTO" },
];

// ---------- Catálogo ----------
async function ratingsFor(ownerIds: string[]) {
  const map = new Map<string, { average: number; count: number }>();
  if (ownerIds.length === 0) return map;

  const rows = await prisma.review.groupBy({
    by: ["targetId"],
    where: { targetId: { in: ownerIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  rows.forEach((r) =>
    map.set(r.targetId, { average: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count._all })
  );
  return map;
}

async function loadCatalog(): Promise<any[]> {
  if (CATALOG && Date.now() - CATALOG.at < CACHE_MS) return CATALOG.items;

  const [list, sold] = await Promise.all([
    listProducts({} as any),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: OrderStatus.CONCLUIDO } },
      _sum: { quantity: true },
    }),
  ]);

  const soldMap = new Map<string, number>();
  sold.forEach((s: any) => {
    if (s.productId) soldMap.set(s.productId, s._sum?.quantity ?? 0);
  });

  const products = list as any[];
  const ownerIds = Array.from(new Set(products.map((p) => p.ownerId).filter(Boolean))) as string[];
  const ratings = await ratingsFor(ownerIds);

  const items = products.map((p) => {
    const price = Number(p.price) || 0;
    const finalPrice = priceOf(p);
    return {
      ...p,
      finalPrice,
      sold: soldMap.get(p.id) ?? 0,
      rating: ratings.get(p.ownerId) ?? { average: 0, count: 0 },
      discountPercent: price > 0 && finalPrice < price ? Math.round((1 - finalPrice / price) * 100) : 0,
    };
  });

  CATALOG = { at: Date.now(), items };
  return items;
}

function slim(p: any) {
  return {
    id: p.id,
    title: p.title,
    price: Number(p.price) || 0,
    finalPrice: priceOf(p),
    discountPercent: p.discountPercent ?? 0,
    unit: p.unit,
    quantity: p.quantity,
    location: p.location ?? null,
    imageUrl: p.imageUrl ?? null,
    department: p.department ?? null,
    subcategory: p.subcategory ?? null,
    tipo: tipoOf(p),
    estadoProduto: p.details?.estadoProduto ?? null,
    ownerId: p.ownerId,
    owner: p.owner ? { id: p.ownerId, name: p.owner.name, isVerified: !!p.owner.isVerified } : null,
    rating: p.rating ?? { average: 0, count: 0 },
    sold: p.sold ?? 0,
    createdAt: p.createdAt ?? null,
  };
}

function full(p: any) {
  return {
    ...slim(p),
    description: p.description ?? null,
    videoUrl: p.videoUrl ?? null,
    details: p.details ?? {},
    isAvailable: p.isAvailable !== false,
  };
}

async function resolveRegion(userId: string, region?: string): Promise<string> {
  if (region && region.trim()) return region.trim();

  const address = await prisma.userAddress.findFirst({ where: { userId, isDefault: true } });
  if (address?.region) return address.region;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { location: true } });
  return user?.location ?? "";
}

// ---------- Filtros e ordenação ----------
export interface SearchFilters {
  q?: string;
  category?: string;
  department?: string;
  subcategory?: string;
  location?: string;
  near?: boolean;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onlyPromo?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

function applyFilters(items: any[], f: SearchFilters, region: string) {
  const words = f.q ? plain(f.q).split(/\s+/).filter(Boolean) : [];
  const location = f.location ? plain(f.location) : "";
  const category = f.category ? CATEGORIES.find((c) => c.key === f.category) : undefined;

  return items.filter((p) => {
    if (category && !category.test(p, region)) return false;
    if (f.department && p.department !== f.department) return false;
    if (f.subcategory && plain(p.subcategory) !== plain(f.subcategory)) return false;
    if (location && !plain(p.location).includes(location)) return false;
    if (f.near && !(region && isNear(p, region))) return false;

    const price = priceOf(p);
    if (f.minPrice !== undefined && price < f.minPrice) return false;
    if (f.maxPrice !== undefined && price > f.maxPrice) return false;
    if (f.minRating !== undefined && (p.rating?.average ?? 0) < f.minRating) return false;
    if (f.onlyPromo && !(p.discountPercent > 0)) return false;

    if (words.length > 0) {
      const hay = plain(
        [p.title, p.description, p.subcategory, p.owner?.name, p.location, DEPARTMENT_WORDS[p.department] ?? ""].join(" ")
      );
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

function sortItems(items: any[], sort?: string) {
  const list = [...items];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => priceOf(a) - priceOf(b));
    case "price_desc":
      return list.sort((a, b) => priceOf(b) - priceOf(a));
    case "sold":
      return list.sort((a, b) => b.sold - a.sold || timeOf(b) - timeOf(a));
    case "rating":
      return list.sort(
        (a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0) || (b.rating?.count ?? 0) - (a.rating?.count ?? 0)
      );
    default:
      return list.sort((a, b) => timeOf(b) - timeOf(a));
  }
}

// ---------- Recomendações ----------
async function preferencesOf(userId: string, catalog: any[]) {
  const [bought, favs] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { buyerId: userId } },
      select: { productId: true },
      orderBy: { order: { createdAt: "desc" } },
      take: 100,
    }),
    prisma.favorite.findMany({ where: { userId } }),
  ]);

  const ids = new Set<string>();
  bought.forEach((b: any) => b.productId && ids.add(b.productId));
  favs.forEach((f: any) => f.productId && ids.add(f.productId));

  const departments = new Map<string, number>();
  const subcategories = new Map<string, number>();
  catalog
    .filter((p) => ids.has(p.id))
    .forEach((p) => {
      if (p.department) departments.set(p.department, (departments.get(p.department) ?? 0) + 1);
      const sub = plain(p.subcategory);
      if (sub) subcategories.set(sub, (subcategories.get(sub) ?? 0) + 1);
    });

  return { departments, subcategories, hasHistory: ids.size > 0 };
}

function recommend(items: any[], prefs: Awaited<ReturnType<typeof preferencesOf>>, region: string) {
  if (!prefs.hasHistory) return [];

  return items
    .map((p) => {
      const sub = Math.min(prefs.subcategories.get(plain(p.subcategory)) ?? 0, 3);
      const dep = Math.min(prefs.departments.get(p.department) ?? 0, 3);
      const score =
        sub * 3 +
        dep * 2 +
        (isNear(p, region) ? 1 : 0) +
        Math.min(p.sold, 10) / 10 +
        (p.rating?.average ?? 0) / 5;
      return { p, score, matched: sub > 0 || dep > 0 };
    })
    .filter((x) => x.matched)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.p);
}

function featuredScore(p: any) {
  return (
    (p.discountPercent > 0 ? 2 : 0) +
    (p.rating?.average ?? 0) +
    (p.owner?.isVerified ? 1 : 0) +
    Math.min(p.sold, 20) / 10
  );
}

// ---------- Início ----------
export async function getHome(userId: string, regionInput?: string) {
  const [catalog, region, unread] = await Promise.all([
    loadCatalog(),
    resolveRegion(userId, regionInput),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  const items = catalog.filter((p) => p.ownerId !== userId && p.quantity > 0);
  const prefs = await preferencesOf(userId, catalog);

  const featured = [...items].sort((a, b) => featuredScore(b) - featuredScore(a)).slice(0, 12);
  const nearby = region
    ? sortItems(items.filter((p) => isNear(p, region)), "sold").slice(0, 12)
    : [];
  const bestSelling = sortItems(items.filter((p) => p.sold > 0), "sold").slice(0, 12);
  const newest = sortItems(items, "recent").slice(0, 12);
  const promotions = [...items]
    .filter((p) => p.discountPercent > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent)
    .slice(0, 12);

  let recommendations = recommend(items, prefs, region);
  if (recommendations.length === 0) {
    recommendations = bestSelling.length > 0 ? bestSelling : newest;
  }

  return {
    region,
    unreadNotifications: unread,
    featured: featured.map(slim),
    nearby: nearby.map(slim),
    bestSelling: bestSelling.map(slim),
    newest: newest.map(slim),
    promotions: promotions.map(slim),
    recommendations: recommendations.map(slim),
    recommendationsFromHistory: prefs.hasHistory,
    categories: CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.icon,
      count: items.filter((p) => c.test(p, region)).length,
    })),
  };
}

export async function getCategories(userId: string, regionInput?: string) {
  const [catalog, region] = await Promise.all([loadCatalog(), resolveRegion(userId, regionInput)]);
  const items = catalog.filter((p) => p.ownerId !== userId && p.quantity > 0);

  return {
    region,
    categories: CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      icon: c.icon,
      count: items.filter((p) => c.test(p, region)).length,
    })),
  };
}

// ---------- Pesquisa e exploração ----------
export async function searchProducts(userId: string, filters: SearchFilters) {
  const [catalog, region] = await Promise.all([loadCatalog(), resolveRegion(userId, filters.region)]);

  const base = catalog.filter((p) => p.ownerId !== userId && p.quantity > 0);
  const filtered = sortItems(applyFilters(base, filters, region), filters.sort);

  const limit = Math.min(60, Math.max(1, Math.floor(filters.limit ?? 30)));
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const start = (page - 1) * limit;

  return {
    total: filtered.length,
    page,
    limit,
    region,
    items: filtered.slice(start, start + limit).map(slim),
  };
}

// ---------- Produto ----------
async function reviewList(sellerId: string, take: number) {
  const rows: any[] = await prisma.review.findMany({
    where: { targetId: sellerId },
    orderBy: { createdAt: "desc" },
    take,
  });

  const authorIds = Array.from(
    new Set(rows.map((r) => r.authorId ?? r.reviewerId ?? r.userId).filter(Boolean))
  ) as string[];
  const authors = authorIds.length
    ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })
    : [];
  const names = new Map(authors.map((a) => [a.id, a.name]));

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? null,
    imageUrl: r.imageUrl ?? null,
    createdAt: r.createdAt,
    authorName: names.get(r.authorId ?? r.reviewerId ?? r.userId) ?? "Cliente",
  }));
}

async function sellerBlock(userId: string, sellerId: string) {
  const [seller, store, followers, mine, sales] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, name: true, phone: true, location: true, role: true, isVerified: true, createdAt: true },
    }),
    prisma.store.findUnique({ where: { ownerId: sellerId } }),
    prisma.favoriteSeller.count({ where: { sellerId } }),
    prisma.favoriteSeller.findFirst({ where: { userId, sellerId } }),
    prisma.order.count({ where: { sellerId, status: OrderStatus.CONCLUIDO } }),
  ]);

  if (!seller) {
    throw new Error("Vendedor não encontrado.");
  }

  const rating = (await ratingsFor([sellerId])).get(sellerId) ?? { average: 0, count: 0 };

  return {
    seller: {
      ...seller,
      rating,
      followers,
      sales,
      isFavorite: !!mine,
      notify: mine ? mine.notify : false,
    },
    store,
  };
}

export async function getProductDetail(userId: string, id: string) {
  const raw: any = await getProductById(id);
  const catalog = await loadCatalog();

  let product = catalog.find((p) => p.id === id);
  if (!product) {
    const rating = (await ratingsFor([raw.ownerId])).get(raw.ownerId) ?? { average: 0, count: 0 };
    const price = Number(raw.price) || 0;
    const finalPrice = priceOf(raw);
    product = {
      ...raw,
      finalPrice,
      rating,
      sold: 0,
      discountPercent: price > 0 && finalPrice < price ? Math.round((1 - finalPrice / price) * 100) : 0,
    };
  }

  const [block, favorite, reviews] = await Promise.all([
    sellerBlock(userId, product.ownerId),
    prisma.favorite.findFirst({ where: { userId, productId: id } }),
    reviewList(product.ownerId, 5),
  ]);

  const others = catalog.filter((p) => p.id !== id && p.quantity > 0 && p.ownerId !== userId);
  const moreFromSeller = sortItems(others.filter((p) => p.ownerId === product.ownerId), "recent").slice(0, 8);
  const similar = sortItems(
    others.filter(
      (p) =>
        p.ownerId !== product.ownerId &&
        ((product.subcategory && plain(p.subcategory) === plain(product.subcategory)) ||
          (!product.subcategory && p.department === product.department))
    ),
    "sold"
  ).slice(0, 8);

  return {
    product: full(product),
    photos: product.imageUrl ? [product.imageUrl] : [],
    seller: block.seller,
    store: block.store,
    reviews,
    isFavorite: !!favorite,
    isMine: product.ownerId === userId,
    moreFromSeller: moreFromSeller.map(slim),
    similar: similar.map(slim),
  };
}

// ---------- Vendedor ----------
export async function getSellerPage(userId: string, sellerId: string) {
  const [block, catalog, reviews] = await Promise.all([
    sellerBlock(userId, sellerId),
    loadCatalog(),
    reviewList(sellerId, 10),
  ]);

  const products = sortItems(
    catalog.filter((p) => p.ownerId === sellerId && p.quantity > 0),
    "recent"
  );

  return {
    seller: block.seller,
    store: block.store,
    reviews,
    products: products.map(slim),
    isMe: sellerId === userId,
  };
}

// ---------- Favoritos ----------
export async function listFavorites(userId: string) {
  const [favs, followed, catalog] = await Promise.all([
    prisma.favorite.findMany({ where: { userId } }),
    prisma.favoriteSeller.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    loadCatalog(),
  ]);

  const ids = new Set(favs.map((f: any) => f.productId));
  const products = sortItems(catalog.filter((p) => ids.has(p.id)), "recent").map(slim);

  const sellerIds = followed.map((f) => f.sellerId);
  const [users, ratings] = await Promise.all([
    sellerIds.length
      ? prisma.user.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, name: true, location: true, role: true, isVerified: true },
        })
      : Promise.resolve([]),
    ratingsFor(sellerIds),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));

  const sellers = followed
    .map((f) => {
      const u = byId.get(f.sellerId);
      if (!u) return null;
      return {
        ...u,
        notify: f.notify,
        rating: ratings.get(u.id) ?? { average: 0, count: 0 },
        productsCount: catalog.filter((p) => p.ownerId === u.id && p.quantity > 0).length,
      };
    })
    .filter(Boolean);

  return { products, sellers };
}

export async function toggleProductFavorite(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const existing = await prisma.favorite.findFirst({ where: { userId, productId } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { favorite: false };
  }

  await prisma.favorite.create({ data: { userId, productId } as any });
  return { favorite: true };
}

export async function toggleSellerFavorite(userId: string, sellerId: string) {
  if (userId === sellerId) {
    throw new Error("Você não pode seguir a si próprio.");
  }

  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { id: true } });
  if (!seller) {
    throw new Error("Vendedor não encontrado.");
  }

  const existing = await prisma.favoriteSeller.findFirst({ where: { userId, sellerId } });
  if (existing) {
    await prisma.favoriteSeller.delete({ where: { id: existing.id } });
    return { favorite: false, notify: false };
  }

  const created = await prisma.favoriteSeller.create({ data: { userId, sellerId } });
  return { favorite: true, notify: created.notify };
}

export async function setSellerNotify(userId: string, sellerId: string, notify: boolean) {
  const existing = await prisma.favoriteSeller.findFirst({ where: { userId, sellerId } });
  if (!existing) {
    throw new Error("Guarde primeiro o vendedor nos favoritos.");
  }

  const updated = await prisma.favoriteSeller.update({ where: { id: existing.id }, data: { notify } });
  return { favorite: true, notify: updated.notify };
}
