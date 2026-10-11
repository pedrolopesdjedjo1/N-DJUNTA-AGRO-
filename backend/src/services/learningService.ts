import { LearningCategory, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const MANAGER_ROLES = ["ADMIN", "GOVERNO", "ONG"];

function clean(value: any, max = 3000): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function httpsUrl(value: any): string | null {
  return typeof value === "string" && value.trim().startsWith("https://") ? value.trim().slice(0, 500) : null;
}

export async function listLearning(filters: { area?: string; category?: string; q?: string }) {
  const where: Prisma.LearningItemWhereInput = {};
  const and: Prisma.LearningItemWhereInput[] = [];

  if (filters.category && (Object.values(LearningCategory) as string[]).includes(filters.category)) {
    where.category = filters.category as LearningCategory;
  }
  if (filters.area) {
    and.push({ OR: [{ area: filters.area }, { area: "GERAL" }] });
  }
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { body: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (and.length) where.AND = and;

  return prisma.learningItem.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function getLearning(id: string) {
  const item = await prisma.learningItem.findUnique({ where: { id } });
  if (!item) {
    throw new Error("Conteúdo não encontrado.");
  }
  return item;
}

export async function createLearning(userId: string, role: string | undefined, input: any) {
  if (!MANAGER_ROLES.includes(role ?? "")) {
    throw new Error("Só a equipa autorizada pode publicar conteúdos.");
  }

  const title = clean(input?.title, 150);
  if (!title) {
    throw new Error("Informe o título.");
  }

  const category = String(input.category ?? "");
  if (!(Object.values(LearningCategory) as string[]).includes(category)) {
    throw new Error("Categoria inválida.");
  }

  return prisma.learningItem.create({
    data: {
      createdById: userId,
      category: category as LearningCategory,
      area: clean(input.area, 30) ?? "GERAL",
      title,
      body: clean(input.body),
      videoUrl: httpsUrl(input.videoUrl),
      imageUrl: httpsUrl(input.imageUrl),
    },
  });
}

export async function deleteLearning(userId: string, role: string | undefined, id: string) {
  const item = await prisma.learningItem.findUnique({ where: { id } });
  if (!item) {
    throw new Error("Conteúdo não encontrado.");
  }
  if (item.createdById !== userId && role !== "ADMIN") {
    throw new Error("Você não tem permissão para apagar este conteúdo.");
  }
  await prisma.learningItem.delete({ where: { id } });
  return { id, deleted: true };
}
