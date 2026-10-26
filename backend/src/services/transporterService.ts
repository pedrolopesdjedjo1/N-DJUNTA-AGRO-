import { prisma } from "../lib/prisma";
import { VEHICLE_TYPES } from "../lib/transportCatalog";
import { values } from "../lib/ngoCatalog";
import { REGIONS } from "../lib/ngoRegions";
import { clean } from "../lib/agentScope";

const VEHICLE_VALUES = values(VEHICLE_TYPES);
const REGION_KEYS = REGIONS.map((r) => r.key);

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

export async function getProfile(userId: string, role?: string) {
  assertTransporter(role);
  const profile = await ensureProfile(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, photoUrl: true, location: true, isVerified: true },
  });
  if (!user) {
    throw new Error("Utilizador não encontrado.");
  }

  return { profile, user, complete: !!profile.vehicleType && profile.regions.length > 0 };
}

export async function saveProfile(userId: string, role: string | undefined, input: any) {
  assertTransporter(role);
  await ensureProfile(userId);

  const data: any = {};

  if (input?.vehicleType !== undefined) {
    const type = input.vehicleType ? String(input.vehicleType) : null;
    if (type && !VEHICLE_VALUES.includes(type)) {
      throw new Error("Escolha o tipo de veículo.");
    }
    data.vehicleType = type;
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

  if (Object.keys(data).length > 0) {
    await prisma.transporterProfile.update({ where: { userId }, data });
  }

  return getProfile(userId, role);
}

export async function setAvailability(userId: string, role: string | undefined, isAvailable: any) {
  assertTransporter(role);
  await ensureProfile(userId);

  await prisma.transporterProfile.update({ where: { userId }, data: { isAvailable: Boolean(isAvailable) } });
  return getProfile(userId, role);
}
