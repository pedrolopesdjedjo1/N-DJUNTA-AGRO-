import { prisma } from "../lib/prisma";
import { REGIONS, findRegion } from "../lib/ngoRegions";
import { clean, plain } from "../lib/agentScope";
import { values } from "../lib/ngoCatalog";
import { distanceKm } from "../lib/transportCatalog";
import { SERVICE_KINDS, ACCOUNT_SECURITY_TIPS, safetyTipsFor } from "../lib/transportToolsCatalog";
import { getSetting } from "../lib/platformSettings";
import { assertTransporter, ensureProfile, shapeDocuments } from "./transporterService";
import { validMe } from "./transportDeliveryService";

const PAGE_SIZE = 25;
const KIND_VALUES = values(SERVICE_KINDS);
const REGION_KEYS = REGIONS.map((r) => r.key);

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

export function shapePoint(s: any, me?: { lat: number; lng: number } | null) {
  const region = REGIONS.find((r) => r.key === s.regionKey);
  const point = s.lat !== null && s.lat !== undefined && s.lng !== null && s.lng !== undefined ? { lat: s.lat, lng: s.lng } : region ? { lat: region.lat, lng: region.lng } : null;

  return {
    id: s.id,
    kind: s.kind,
    name: s.name,
    address: s.address ?? null,
    regionKey: s.regionKey ?? null,
    regionName: region?.name ?? null,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    exact: s.lat !== null && s.lat !== undefined && s.lng !== null && s.lng !== undefined,
    phone: s.phone ?? null,
    hours: s.hours ?? null,
    notes: s.notes ?? null,
    status: s.status,
    distanceKm: me && point ? r1(distanceKm(me.lat, me.lng, point.lat, point.lng)) : null,
  };
}

// Lê e valida os campos de um posto ou oficina (usado também pela equipa)
export function readServicePoint(input: any) {
  const kind = String(input?.kind ?? "");
  if (!KIND_VALUES.includes(kind)) {
    throw new Error("Escolha o tipo de serviço.");
  }
  const name = clean(input?.name, 100);
  if (!name || name.length < 3) {
    throw new Error("Escreva o nome do local.");
  }

  const address = clean(input?.address, 160);
  const regionKey = input?.regionKey && REGION_KEYS.includes(String(input.regionKey)) ? String(input.regionKey) : findRegion(address)?.key ?? null;
  if (!regionKey) {
    throw new Error("Escolha a região onde fica.");
  }

  const me = validMe(input?.lat, input?.lng);
  const phone = clean(input?.phone, 30);
  if (phone && !/^\+?[\d\s-]{7,20}$/.test(phone)) {
    throw new Error("Telefone inválido.");
  }

  return {
    kind,
    name,
    address,
    regionKey,
    lat: me?.lat ?? null,
    lng: me?.lng ?? null,
    phone,
    hours: clean(input?.hours, 80),
    notes: clean(input?.notes, 200),
  };
}

// =====================================================================
// Postos de combustível, oficinas, estacionamentos e manutenção
// =====================================================================
export async function listServicePoints(userId: string, role: string | undefined, filters: { kind?: string; region?: string; q?: string; lat?: number; lng?: number; page?: number }) {
  assertTransporter(role);
  const me = validMe(filters.lat, filters.lng);

  const where: any = { status: "PUBLICADO" };
  if (filters.kind && KIND_VALUES.includes(filters.kind)) where.kind = filters.kind;
  if (filters.region && REGION_KEYS.includes(filters.region)) where.regionKey = filters.region;

  const rows = await prisma.servicePoint.findMany({ where, take: 500 });
  const counts = await prisma.servicePoint.groupBy({ by: ["kind"], where: { status: "PUBLICADO" }, _count: { _all: true } });

  const needle = plain(filters.q);
  let list = rows.map((s) => shapePoint(s, me));
  if (needle) list = list.filter((s) => plain(`${s.name} ${s.address} ${s.regionName}`).includes(needle));
  list.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999) || a.name.localeCompare(b.name));

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  return {
    byKind: Object.fromEntries(counts.map((c) => [c.kind, c._count._all])),
    total: list.length,
    page,
    pageSize: PAGE_SIZE,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    withPosition: !!me,
  };
}

// O transportador sugere um local que falta. Fica em análise até a equipa publicar.
export async function suggestServicePoint(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);

  const data = readServicePoint(input);

  const pending = await prisma.servicePoint.count({ where: { suggestedBy: userId, status: "PENDENTE" } });
  if (pending >= 5) {
    throw new Error("Já tem 5 sugestões em análise. Espere pela resposta da equipa.");
  }
  const dup = await prisma.servicePoint.findFirst({ where: { kind: data.kind, regionKey: data.regionKey, name: { equals: data.name, mode: "insensitive" }, status: { not: "ESCONDIDO" } } });
  if (dup) {
    throw new Error("Este local já está na lista ou em análise.");
  }

  const created = await prisma.servicePoint.create({ data: { ...data, status: "PENDENTE", suggestedBy: userId } });
  return shapePoint(created, null);
}

export async function mySuggestions(userId: string, role: string | undefined) {
  assertTransporter(role);

  const rows = await prisma.servicePoint.findMany({ where: { suggestedBy: userId }, orderBy: { createdAt: "desc" }, take: 30 });
  return rows.map((s) => ({ ...shapePoint(s, null), reviewNote: s.reviewNote, reviewedAt: s.reviewedAt, createdAt: s.createdAt }));
}

// =====================================================================
// Dicas de segurança
// =====================================================================
export async function safetyTips(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);
  return safetyTipsFor(profile.vehicleType, profile.cargoTypes ?? []);
}

// =====================================================================
// Segurança da conta
// =====================================================================
export async function getSecurity(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [user, documents, devices, openReports] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true, phone: true, createdAt: true } }),
    prisma.transporterDocument.findMany({ where: { transporterId: userId } }),
    prisma.userDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" }, take: 5 }),
    prisma.contentReport.count({ where: { reporterId: userId, status: { in: ["ABERTA", "EM_ANALISE"] } } }),
  ]);

  const shaped = shapeDocuments(documents);
  return {
    verification: {
      status: user?.isVerified && profile.verificationStatus === "RASCUNHO" ? "APROVADO" : profile.verificationStatus,
      note: profile.verificationNote ?? null,
    },
    documents: {
      total: shaped.length,
      expired: shaped.filter((d) => d.expired).length,
      expiringSoon: shaped.filter((d) => d.expiringSoon).length,
    },
    location: { shareLocation: profile.shareLocation },
    devices: devices.map((d) => ({ id: d.id, label: d.label, platform: d.platform, lastSeenAt: d.lastSeenAt })),
    phone: user?.phone ?? null,
    openReports,
    tips: ACCOUNT_SECURITY_TIPS,
  };
}

// =====================================================================
// Configurações: privacidade, avisos, idioma, termos e suporte
// =====================================================================
export async function getTransporterSettings(userId: string, role: string | undefined) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const [languages, email, phones, terms, privacy] = await Promise.all([
    getSetting<string[]>("platform.languages"),
    getSetting<string>("support.email"),
    getSetting<string[]>("support.phones"),
    getSetting<string>("legal.terms"),
    getSetting<string>("legal.privacy"),
  ]);

  return {
    preferences: {
      shareLocation: profile.shareLocation,
      notifyNewLoads: profile.notifyNewLoads,
      isAvailable: profile.isAvailable,
    },
    languages,
    support: { email, phones },
    legal: { hasTerms: !!terms, hasPrivacy: !!privacy },
  };
}
