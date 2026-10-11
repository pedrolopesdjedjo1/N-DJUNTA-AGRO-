import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { normalizePhone } from "./phoneAuthService";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const INTERNAL_EMAIL_DOMAIN = "@phone.nodjunta.gb";

const FLAGS = [
  "notifyOrders",
  "notifyMessages",
  "notifyPayments",
  "notifyDeliveries",
  "notifyEvents",
  "notifyOpportunities",
] as const;

async function ensureSettings(userId: string) {
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userSettings.create({ data: { userId } });
}

async function verifyPassword(user: any, password: string) {
  const now = new Date();

  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    throw new Error(`Muitas tentativas erradas. Tente de novo em ${minutes} minuto(s).`);
  }

  const ok = await bcrypt.compare(String(password ?? ""), user.password);
  if (ok) return;

  const attempts = (user.failedLoginAttempts ?? 0) + 1;

  if (attempts >= MAX_ATTEMPTS) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
      },
    });
    throw new Error(`Muitas tentativas erradas. Tente de novo em ${LOCK_MINUTES} minutos.`);
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts } });
  throw new Error(`Senha atual incorreta. Restam ${MAX_ATTEMPTS - attempts} tentativa(s).`);
}

export async function getSettings(userId: string) {
  const [settings, user] = await Promise.all([
    ensureSettings(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, location: true, preferredLanguage: true, email: true },
    }),
  ]);

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const notifications: Record<string, boolean> = {};
  FLAGS.forEach((flag) => {
    notifications[flag] = (settings as any)[flag];
  });

  const internal = String(user.email).endsWith(INTERNAL_EMAIL_DOMAIN);

  return {
    notifications,
    user: {
      name: user.name,
      phone: user.phone ?? "",
      location: user.location ?? "",
      preferredLanguage: user.preferredLanguage,
      email: internal ? "" : user.email,
    },
  };
}

export async function updateSettings(userId: string, input: any) {
  await ensureSettings(userId);

  const data: Record<string, boolean> = {};
  FLAGS.forEach((flag) => {
    if (typeof input?.[flag] === "boolean") data[flag] = input[flag];
  });
  if (Object.keys(data).length) {
    await prisma.userSettings.update({ where: { userId }, data });
  }

  const userData: any = {};
  if (typeof input?.location === "string") {
    userData.location = input.location.trim().slice(0, 200) || null;
  }
  if (input?.preferredLanguage === "PORTUGUES" || input?.preferredLanguage === "CRIOULO") {
    userData.preferredLanguage = input.preferredLanguage;
  }
  if (Object.keys(userData).length) {
    await prisma.user.update({ where: { id: userId }, data: userData });
  }

  return getSettings(userId);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  await verifyPassword(user, currentPassword);

  const next = String(newPassword ?? "");
  const phoneUser = String(user.email).endsWith(INTERNAL_EMAIL_DOMAIN);

  if (phoneUser && !/^\d{4,6}$/.test(next)) {
    throw new Error("A nova senha deve ter de 4 a 6 números.");
  }
  if (!phoneUser && next.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
  }
  if (next === String(currentPassword)) {
    throw new Error("A nova senha deve ser diferente da atual.");
  }

  const hashed = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, failedLoginAttempts: 0, lockedUntil: null },
  });

  return { changed: true };
}

export async function changePhone(userId: string, newPhone: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  await verifyPassword(user, password);

  const phone = normalizePhone(newPhone);
  if (phone.length < 7 || phone.length > 15) {
    throw new Error("Número de celular inválido.");
  }

  const taken = await prisma.user.findFirst({
    where: {
      phone: { in: [phone, `245${phone}`, `+245${phone}`] },
      NOT: { id: userId },
    },
  });
  if (taken) {
    throw new Error("Este número já está a ser usado por outra conta.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { phone, failedLoginAttempts: 0, lockedUntil: null },
  });

  return { phone };
}
