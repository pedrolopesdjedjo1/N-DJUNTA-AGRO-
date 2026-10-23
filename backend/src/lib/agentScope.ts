import { prisma } from "./prisma";

export function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Se uma consulta falhar, o resto da tela continua a funcionar
export async function safe<T>(label: string, work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.error(`agent: ${label}`, error);
    return fallback;
  }
}

export interface ClientScope {
  ids: string[];
  set: Set<string>;
  linkByClient: Map<string, string>;
}

// Os clientes ativos do agente: tudo o que ele vê de encomendas e produtos fica limitado a estas pessoas
export async function clientScope(agentId: string): Promise<ClientScope> {
  const links = await prisma.agentClient.findMany({ where: { agentId, status: "ATIVO" }, select: { id: true, clientId: true } });
  return {
    ids: links.map((l) => l.clientId),
    set: new Set(links.map((l) => l.clientId)),
    linkByClient: new Map(links.map((l) => [l.clientId, l.id])),
  };
}

export interface Person {
  id: string;
  name: string;
  role: string;
  location: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  isClient: boolean;
  linkId: string | null;
  phone: string | null;
}

// O telefone só aparece se a pessoa for cliente do agente. Para os outros, só o chat do app.
export async function peopleMap(ids: string[], scope: ClientScope): Promise<Map<string, Person>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, Person>();
  if (unique.length === 0) return map;

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, role: true, location: true, photoUrl: true, isVerified: true, phone: true },
  });

  users.forEach((u) => {
    const isClient = scope.set.has(u.id);
    map.set(u.id, {
      id: u.id,
      name: u.name,
      role: String(u.role),
      location: u.location ?? null,
      photoUrl: u.photoUrl ?? null,
      isVerified: !!u.isVerified,
      isClient,
      linkId: scope.linkByClient.get(u.id) ?? null,
      phone: isClient ? u.phone ?? null : null,
    });
  });
  return map;
}

// Encomendas em que participa algum cliente do agente
export async function loadClientOrders(ids: string[], take = 600): Promise<any[]> {
  if (ids.length === 0) return [];
  const rows: any[] = await prisma.order.findMany({
    where: { OR: [{ buyerId: { in: ids } }, { sellerId: { in: ids } }] },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows;
}

// Dá os mesmos campos de um produto, sejam quais forem os nomes exatos na base de dados
export function normalizeProduct(p: any) {
  const price = Number(p.price ?? p.unitPrice ?? NaN);
  const stockRaw = p.stock ?? p.quantity ?? p.availableQuantity ?? null;
  const stock = stockRaw === null || stockRaw === undefined || isNaN(Number(stockRaw)) ? null : Number(stockRaw);
  const images: string[] = Array.isArray(p.imageUrls)
    ? p.imageUrls
    : Array.isArray(p.images)
    ? p.images
    : p.imageUrl
    ? [p.imageUrl]
    : p.photoUrl
    ? [p.photoUrl]
    : [];

  return {
    id: p.id as string,
    ownerId: p.ownerId as string,
    title: String(p.title ?? p.name ?? "Produto"),
    description: (p.description ?? null) as string | null,
    price: isNaN(price) ? null : price,
    unit: (p.unit ?? null) as string | null,
    stock,
    department: p.department ? String(p.department) : null,
    subcategory: (p.subcategory ?? p.category ?? null) as string | null,
    location: (p.location ?? null) as string | null,
    images,
    isAvailable: p.isAvailable !== false,
    details: p.details ?? null,
    createdAt: p.createdAt,
  };
}
