import { PrismaClient, SmsDirection } from "@prisma/client";
import { getAveragePriceByCategory } from "./marketPriceService";

const prisma = new PrismaClient();

// Este módulo prepara a lógica para funcionar com SMS. Para funcionar de
// verdade em produção, é preciso contratar um serviço de gateway de SMS
// (ex: Africa's Talking, Twilio) que envie o SMS recebido para a rota
// POST /api/sms/incoming. Por enquanto, o texto pode ser testado direto
// pela API, sem custo.

async function logSms(phone: string, direction: SmsDirection, message: string) {
  return prisma.smsLog.create({
    data: { phone, direction, message },
  });
}

// Comandos simples que um agricultor com celular básico pode digitar e enviar por SMS:
// "PRECO" -> devolve o preço médio das categorias
// Qualquer outro texto -> resposta de ajuda
export async function handleIncomingSms(phone: string, message: string) {
  await logSms(phone, SmsDirection.RECEBIDO, message);

  const command = message.trim().toUpperCase();
  let response: string;

  if (command === "PRECO" || command === "PREÇO") {
    const prices = await getAveragePriceByCategory();
    response = prices
      .map((p) => `${p.category}: media ${Math.round(p.averagePrice)} XOF`)
      .join(" | ");

    if (!response) {
      response = "Ainda nao ha precos cadastrados no sistema.";
    }
  } else {
    response =
      "NôdjuntaAgro GB: envie PRECO para ver os precos medios dos produtos. Mais comandos em breve.";
  }

  await logSms(phone, SmsDirection.ENVIADO, response);

  return response;
}

export async function listSmsLogs(phone?: string) {
  return prisma.smsLog.findMany({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
}
