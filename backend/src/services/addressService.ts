import { prisma } from "../lib/prisma";

const LABELS = ["CASA", "TRABALHO", "OUTRO"];
const MAX_ADDRESSES = 10;

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function readCoords(input: any) {
  const has = (v: any) => v !== undefined && v !== null && v !== "";
  if (!has(input?.lat) && !has(input?.lng)) return { lat: null as number | null, lng: null as number | null };

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!has(input.lat) || !has(input.lng) || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordenadas inválidas.");
  }
  return { lat, lng };
}

async function syncLocation(userId: string, region: string | null) {
  if (region) {
    await prisma.user.update({ where: { id: userId }, data: { location: region } });
  }
}

export async function listAddresses(userId: string) {
  return prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function createAddress(userId: string, input: any) {
  const address = clean(input?.address, 200);
  if (!address || address.length < 3) {
    throw new Error("Escreva o endereço.");
  }

  const label = String(input?.label ?? "CASA");
  if (!LABELS.includes(label)) {
    throw new Error("Tipo de endereço inválido.");
  }

  const count = await prisma.userAddress.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    throw new Error(`Pode guardar até ${MAX_ADDRESSES} endereços. Apague algum para criar outro.`);
  }

  const { lat, lng } = readCoords(input);
  const region = clean(input?.region, 80);
  const isDefault = count === 0 || input?.isDefault === true;

  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.userAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.userAddress.create({
      data: { userId, label, name: clean(input?.name, 60), address, region, lat, lng, isDefault },
    });
  });

  if (isDefault) await syncLocation(userId, region);
  return created;
}

export async function updateAddress(userId: string, id: string, input: any) {
  const found = await prisma.userAddress.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Endereço não encontrado.");
  }

  const data: any = {};

  if (input?.address !== undefined) {
    const address = clean(input.address, 200);
    if (!address || address.length < 3) {
      throw new Error("Escreva o endereço.");
    }
    data.address = address;
  }
  if (input?.label !== undefined) {
    if (!LABELS.includes(String(input.label))) {
      throw new Error("Tipo de endereço inválido.");
    }
    data.label = String(input.label);
  }
  if (input?.name !== undefined) data.name = clean(input.name, 60);
  if (input?.region !== undefined) data.region = clean(input.region, 80);
  if (input?.lat !== undefined || input?.lng !== undefined) {
    const { lat, lng } = readCoords(input);
    data.lat = lat;
    data.lng = lng;
  }

  const updated = await prisma.userAddress.update({ where: { id }, data });
  if (updated.isDefault) await syncLocation(userId, updated.region);
  return updated;
}

export async function setDefaultAddress(userId: string, id: string) {
  const found = await prisma.userAddress.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Endereço não encontrado.");
  }

  await prisma.$transaction([
    prisma.userAddress.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
    prisma.userAddress.update({ where: { id }, data: { isDefault: true } }),
  ]);

  await syncLocation(userId, found.region);
  return listAddresses(userId);
}

export async function deleteAddress(userId: string, id: string) {
  const found = await prisma.userAddress.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    throw new Error("Endereço não encontrado.");
  }

  await prisma.userAddress.delete({ where: { id } });

  if (found.isDefault) {
    const next = await prisma.userAddress.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (next) {
      await prisma.userAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      await syncLocation(userId, next.region);
    }
  }

  return { id, deleted: true };
}
