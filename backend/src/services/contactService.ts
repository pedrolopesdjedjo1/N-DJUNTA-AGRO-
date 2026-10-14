import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const MANAGER_ROLES = ["ADMIN", "GOVERNO", "ONG"];
export const CONTACT_KINDS = ["GERAL", "AGRICOLA", "MAR", "SAUDE", "SEGURANCA", "VETERINARIO"];

function clean(value: any, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function listContacts(filters: { kind?: string; region?: string; q?: string }) {
  const where: Prisma.ImportantContactWhereInput = {};
  const and: Prisma.ImportantContactWhereInput[] = [];

  if (filters.kind && CONTACT_KINDS.includes(filters.kind)) {
    where.kind = filters.kind;
  }
  if (filters.region) {
    and.push({
      OR: [{ region: null }, { region: { contains: filters.region, mode: "insensitive" } }],
    });
  }
  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (and.length) where.AND = and;

  return prisma.importantContact.findMany({ where, orderBy: [{ kind: "asc" }, { name: "asc" }] });
}

export async function createContact(userId: string, role: string | undefined, input: any) {
  if (!MANAGER_ROLES.includes(role ?? "")) {
    throw new Error("Só a equipa autorizada pode adicionar contactos.");
  }

  const name = clean(input?.name, 120);
  const phone = clean(input?.phone, 20);
  if (!name || !phone) {
    throw new Error("Informe o nome e o telefone.");
  }
  if (!/^[+\d][\d\s-]{5,19}$/.test(phone)) {
    throw new Error("Telefone inválido.");
  }

  const kind = String(input.kind ?? "GERAL");
  if (!CONTACT_KINDS.includes(kind)) {
    throw new Error("Tipo de contacto inválido.");
  }

  return prisma.importantContact.create({
    data: {
      createdById: userId,
      name,
      phone,
      kind,
      region: clean(input.region, 80),
      description: clean(input.description, 300),
    },
  });
}

export async function deleteContact(userId: string, role: string | undefined, id: string) {
  const contact = await prisma.importantContact.findUnique({ where: { id } });
  if (!contact) {
    throw new Error("Contacto não encontrado.");
  }
  if (contact.createdById !== userId && role !== "ADMIN") {
    throw new Error("Você não tem permissão para apagar este contacto.");
  }
  await prisma.importantContact.delete({ where: { id } });
  return { id, deleted: true };
}
