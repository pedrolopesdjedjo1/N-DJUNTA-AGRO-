import { prisma } from "../lib/prisma";

// Só existe UMA linha de configurações na plataforma inteira.
// Se ainda não existir, cria com taxa 0% (gratuito) por padrão.
export async function getSettings() {
  let settings = await prisma.platformSettings.findFirst();

  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: { commissionPercentage: 0 },
    });
  }

  return settings;
}

export async function updateCommission(commissionPercentage: number) {
  if (commissionPercentage < 0 || commissionPercentage > 100) {
    throw new Error("A taxa deve ser um número entre 0 e 100.");
  }

  const settings = await getSettings();

  return prisma.platformSettings.update({
    where: { id: settings.id },
    data: { commissionPercentage },
  });
}

// Usado internamente por outros módulos (ex: pagamentos) para calcular a taxa
export async function calculateFee(amount: number) {
  const settings = await getSettings();
  const feeAmount = (amount * settings.commissionPercentage) / 100;
  const netAmount = amount - feeAmount;

  return { feeAmount, netAmount, commissionPercentage: settings.commissionPercentage };
}
