import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generateToken } from "../utils/jwt";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const INTERNAL_EMAIL_DOMAIN = "@phone.nodjunta.gb";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  location?: string;
  email?: string;
}

interface LoginInput {
  phone?: string;
  email?: string;
  password: string;
}

// Deixa só os números e tira o código do país (245) quando vier junto
export function normalizePhone(raw: string): string {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("245") && digits.length > 9) digits = digits.slice(3);
  return digits;
}

// Formatos em que o número pode ter sido salvo antes
function phoneCandidates(raw: string): string[] {
  const n = normalizePhone(raw);
  const list = [n, `245${n}`, `+245${n}`, String(raw ?? "").trim()];
  return Array.from(new Set(list.filter(Boolean)));
}

function publicUser(user: any) {
  const internal = String(user.email).endsWith(INTERNAL_EMAIL_DOMAIN);
  return {
    id: user.id,
    name: user.name,
    email: internal ? "" : user.email,
    phone: user.phone ?? "",
    role: user.role,
    isVerified: user.isVerified,
  };
}

export async function registerUser(data: RegisterInput) {
  const phone = normalizePhone(data.phone);

  if (phone.length < 7 || phone.length > 15) {
    throw new AuthError("Número de celular inválido.");
  }

  if (!/^\d{4,6}$/.test(String(data.password))) {
    throw new AuthError("A senha deve ter de 4 a 6 números.");
  }

  const validRoles = Object.values(UserRole) as string[];
  if (!validRoles.includes(String(data.role))) {
    throw new AuthError("Perfil inválido.");
  }
  if (String(data.role) === "ADMIN") {
    throw new AuthError("Este perfil não pode ser escolhido no cadastro.");
  }

  const existingPhone = await prisma.user.findFirst({
    where: { phone: { in: phoneCandidates(data.phone) } },
  });
  if (existingPhone) {
    throw new AuthError("Este número de celular já está cadastrado.");
  }

  const email =
    data.email && data.email.trim()
      ? data.email.trim().toLowerCase()
      : `${phone}${INTERNAL_EMAIL_DOMAIN}`;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new AuthError("Este e-mail já está cadastrado.");
  }

  const hashedPassword = await bcrypt.hash(String(data.password), 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      phone,
      password: hashedPassword,
      role: data.role,
      location: data.location,
    },
  });

  const token = generateToken({ userId: user.id, role: user.role });

  return { token, user: publicUser(user) };
}

export async function loginUser(data: LoginInput) {
  const invalid = "Número de celular ou senha inválidos.";
  let user: any = null;

  if (data.phone && String(data.phone).trim()) {
    user = await prisma.user.findFirst({
      where: { phone: { in: phoneCandidates(data.phone) } },
    });
  } else if (data.email && String(data.email).trim()) {
    user = await prisma.user.findUnique({
      where: { email: String(data.email).trim().toLowerCase() },
    });
  }

  if (!user) {
    throw new AuthError(invalid, 401);
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    throw new AuthError(
      `Muitas tentativas erradas. Tente de novo em ${minutes} minuto(s).`,
      429
    );
  }

  const passwordMatches = await bcrypt.compare(String(data.password), user.password);

  if (!passwordMatches) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;

    if (attempts >= MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
        },
      });
      throw new AuthError(
        `Muitas tentativas erradas. Tente de novo em ${LOCK_MINUTES} minutos.`,
        429
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts },
    });
    throw new AuthError(
      `${invalid} Restam ${MAX_ATTEMPTS - attempts} tentativa(s).`,
      401
    );
  }

  if (!user.isActive) {
    throw new AuthError("Esta conta está desativada.", 401);
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const token = generateToken({ userId: user.id, role: user.role });

  return { token, user: publicUser(user) };
}
