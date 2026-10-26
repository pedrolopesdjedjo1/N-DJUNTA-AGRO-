import { prisma } from "../lib/prisma";
import { VEHICLE_TYPES } from "../lib/transportCatalog";
import { values } from "../lib/ngoCatalog";
import { REGIONS } from "../lib/ngoRegions";
import { clean, safe } from "../lib/agentScope";

const VEHICLE_VALUES = values(VEHICLE_TYPES);
const REGION_KEYS = REGIONS.map((r) => r.key);
const DAY = 86400000;

function validStorageUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

export function assertTransporter(role?: string) {
  if (role !== "TRANSPORTADOR") {
    throw new Error("Esta área é reservada aos transportadores.");
  }
}

export async function ensureProfile(userId: string) {
  const found = await prisma.transporterProfile.findUnique({ where: { userId } });
  if (found) return found;
  return prisma.transporterProfile.create({ data: { userId } });
}

export function shapeDocuments(documents: any[]) {
  const now = Date.now();
  return documents.map((d) => {
    const expires = d.expiresAt ? new Date(d.expiresAt).getTime() : null;
    return {
      ...d,
      expired: expires !== null && expires < now,
      expiringSoon: expires !== null && expires >= now && expires - now <= 30 * DAY,
    };
  });
}

export function checklist(profile: any, user: any, documents: any[]) {
  const needsPlate = !!profile.vehicleType && profile.vehicleType !== "BARCO";
  const items = [
    { key: "name", label: "Nome", done: !!user.name && String(user.name).trim().length >= 2 },
    { key: "photo", label: "Foto de perfil", done: !!user.photoUrl },
    { key: "phone", label: "Telefone", done: !!user.phone },
    { key: "vehicle", label: "Tipo de veículo", done: !!profile.vehicleType },
    ...(needsPlate ? [{ key: "plate", label: "Matrícula do veículo", done: !!profile.plate }] : []),
    { key: "regions", label: "Pelo menos uma região onde trabalha", done: profile.regions.length > 0 },
    { key: "identification", label: "Documento de identificação", done: documents.some((d) => d.kind === "IDENTIFICACAO") },
    {
      key: "driving",
      label: "Carta de condução ou registo do veículo",
      done: documents.some((d) => d.kind === "CARTA_CONDUCAO" || d.kind === "REGISTO_VEICULO"),
    },
  ];
  return { items, canSubmit: items.every((i) => i.done), missing: items.filter((i) => !i.done).map((i) => i.label) };
}

async function ratingOf(userId: string) {
  return safe(
    "avaliação do transportador",
    async () => {
      const agg = await prisma.review.aggregate({ where: { targetId: userId }, _avg: { rating: true }, _count: { _all: true } });
      return { average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null, count: agg._count._all };
    },
    { average: null as number | null, count: 0 }
  );
}

// =====================================================================
// O meu perfil de transportador
// =====================================================================
export async function getProfile(userId: string, role?: string) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [user, documents, rating, delivered] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true },
    }),
    prisma.transporterDocument.findMany({ where: { transporterId: userId }, orderBy: { createdAt: "desc" } }),
    ratingOf(userId),
    prisma.deliveryEvent.count({ where: { actorId: userId, kind: "ENTREGUE" } }),
  ]);
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }

  // Quem já estava verificado antes desta função continua aprovado
  const status = user.isVerified && profile.verificationStatus === "RASCUNHO" ? "APROVADO" : profile.verificationStatus;

  return {
    profile: { ...profile, verificationStatus: status },
    user,
    documents: shapeDocuments(documents),
    checklist: checklist(profile, user, documents),
    rating,
    stats: { delivered },
    complete: !!profile.vehicleType && profile.regions.length > 0,
  };
}

export async function saveProfile(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  const before = await ensureProfile(userId);

  const data: any = {};

  if (input?.vehicleType !== undefined) {
    const type = input.vehicleType ? String(input.vehicleType) : null;
    if (type && !VEHICLE_VALUES.includes(type)) {
      throw new Error("Escolha o tipo de veículo.");
    }
    data.vehicleType = type;
  }

  if (input?.vehicleBrand !== undefined) data.vehicleBrand = clean(input.vehicleBrand, 40);
  if (input?.vehicleModel !== undefined) data.vehicleModel = clean(input.vehicleModel, 40);

  if (input?.vehicleYear !== undefined) {
    if (input.vehicleYear === null || input.vehicleYear === "") {
      data.vehicleYear = null;
    } else {
      const year = Math.floor(Number(input.vehicleYear));
      if (isNaN(year) || year < 1950 || year > new Date().getFullYear() + 1) {
        throw new Error("Ano do veículo inválido.");
      }
      data.vehicleYear = year;
    }
  }

  if (input?.plate !== undefined) {
    const plate = clean(input.plate, 20);
    data.plate = plate ? plate.toUpperCase() : null;
  }

  if (input?.capacityKg !== undefined) {
    if (input.capacityKg === null || input.capacityKg === "") {
      data.capacityKg = null;
    } else {
      const n = Number(String(input.capacityKg).replace(",", "."));
      if (isNaN(n) || n <= 0 || n > 200000) {
        throw new Error("A capacidade de carga deve ser um número de quilos maior que zero.");
      }
      data.capacityKg = n;
    }
  }

  if (Array.isArray(input?.regions)) {
    const wanted = Array.from(new Set(input.regions.map(String))) as string[];
    if (!wanted.every((r) => REGION_KEYS.includes(r))) {
      throw new Error("Região inválida.");
    }
    data.regions = wanted.slice(0, 12);
  }

  if (input?.bio !== undefined) data.bio = clean(input.bio, 500);
  if (input?.isAvailable !== undefined) data.isAvailable = Boolean(input.isAvailable);

  const userData: any = {};
  if (input?.name !== undefined) {
    const name = clean(input.name, 120);
    if (!name || name.length < 2) {
      throw new Error("Escreva o seu nome.");
    }
    userData.name = name;
  }
  if (input?.location !== undefined) userData.location = clean(input.location, 120);
  if (input?.photoUrl !== undefined) {
    if (input.photoUrl && !validStorageUrl(input.photoUrl)) {
      throw new Error("Foto inválida.");
    }
    userData.photoUrl = input.photoUrl || null;
  }

  // Mudar a matrícula depois de aprovado exige nova verificação
  const plateChanged = data.plate !== undefined && data.plate !== before.plate;
  if (before.verificationStatus === "APROVADO" && plateChanged) {
    data.verificationStatus = "RASCUNHO";
    data.verificationNote = "A matrícula foi alterada. Envie de novo para verificação.";
    userData.isVerified = false;
  }

  if (Object.keys(data).length > 0) {
    await prisma.transporterProfile.update({ where: { userId }, data });
  }
  if (Object.keys(userData).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: userData });
  }

  return getProfile(userId, role);
}

export async function setAvailability(userId: string, role: string | undefined, isAvailable: any) {
  assertTransporter(role);
  await ensureProfile(userId);

  await prisma.transporterProfile.update({ where: { userId }, data: { isAvailable: Boolean(isAvailable) } });
  return getProfile(userId, role);
}

// =====================================================================
// Cartão do transportador, visto por quem procura transporte (sem telefone)
// =====================================================================
export async function getPublicTransporter(viewerId: string, transporterId: string) {
  const profile = await prisma.transporterProfile.findUnique({ where: { userId: transporterId } });
  const user = await prisma.user.findUnique({
    where: { id: transporterId },
    select: { id: true, name: true, role: true, photoUrl: true, location: true, isVerified: true, isActive: true },
  });
  if (!profile || !user || !user.isActive || String(user.role) !== "TRANSPORTADOR") {
    throw new Error("Transportador não encontrado.");
  }

  const [rating, delivered, recent] = await Promise.all([
    ratingOf(transporterId),
    prisma.deliveryEvent.count({ where: { actorId: transporterId, kind: "ENTREGUE" } }),
    safe(
      "avaliações recentes",
      async () => (await prisma.review.findMany({ where: { targetId: transporterId }, orderBy: { createdAt: "desc" }, take: 5 })) as any[],
      [] as any[]
    ),
  ]);

  return {
    transporter: {
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      location: user.location,
      isVerified: user.isVerified,
      isMe: viewerId === transporterId,
      isAvailable: profile.isAvailable,
      vehicleType: profile.vehicleType,
      vehicleBrand: profile.vehicleBrand,
      vehicleModel: profile.vehicleModel,
      vehicleYear: profile.vehicleYear,
      capacityKg: profile.capacityKg,
      regions: profile.regions.map((k) => REGIONS.find((r) => r.key === k)?.name ?? k),
      bio: profile.bio,
    },
    rating,
    delivered,
    recentReviews: recent.map((r) => ({ id: r.id, rating: Number(r.rating) || 0, comment: r.comment ?? null, createdAt: r.createdAt })),
  };
}
