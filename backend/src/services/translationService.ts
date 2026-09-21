import { PrismaClient, Language } from "@prisma/client";

const prisma = new PrismaClient();

// Devolve todas as traduções no formato { chave: texto }, já no idioma pedido
export async function getAllTranslations(language: Language) {
  const translations = await prisma.translation.findMany();

  const result: Record<string, string> = {};
  for (const t of translations) {
    result[t.key] = language === Language.CRIOULO ? t.crioulo : t.portugues;
  }

  return result;
}

// Usado pelo admin para cadastrar ou atualizar um texto traduzido
export async function upsertTranslation(key: string, portugues: string, crioulo: string) {
  return prisma.translation.upsert({
    where: { key },
    update: { portugues, crioulo },
    create: { key, portugues, crioulo },
  });
}

export async function updateUserLanguage(userId: string, language: Language) {
  return prisma.user.update({
    where: { id: userId },
    data: { preferredLanguage: language },
  });
}
