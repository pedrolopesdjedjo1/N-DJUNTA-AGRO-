// Garante que as listas de valores (enums) usadas pelo codigo existem em
// @prisma/client, mesmo que o "prisma generate" nao as tenha gerado.
// Carregado antes do servidor com: node -r ./enumsShim.js dist/server.js
const prisma = require("@prisma/client");

const LISTAS = {
  OrderStatus: ["NOVO", "ACEITO", "EM_PREPARACAO", "PRONTO", "ENVIADO", "CONCLUIDO", "CANCELADO"],
  DeliveryStatus: ["SOLICITADA", "ACEITA", "RECOLHIDA", "EM_TRANSITO", "ENTREGUE", "CANCELADA"],
  TicketStatus: ["ABERTO", "EM_ANALISE", "RESOLVIDO"],
  TicketKind: ["EMERGENCIA", "PEDIDO", "PAGAMENTO", "ENTREGA", "RECLAMACAO", "SUGESTAO", "OUTRO"],
  SosStatus: ["ABERTO", "EM_RESGATE", "RESOLVIDO", "CANCELADO"],
  SosKind: ["SOS", "MOTOR", "BARCO_AVARIADO", "COMBUSTIVEL", "HOMEM_AO_MAR", "MAU_TEMPO", "OUTRO"],
  PromotionKind: ["DESCONTO", "OFERTA_ESPECIAL", "DESTAQUE", "CAMPANHA"],
  EventKind: ["FEIRA", "EVENTO_CULTURAL", "MERCADO_LOCAL", "EXPOSICAO", "OUTRO"],
  LearningCategory: [
    "GUIA", "CULTIVO", "COLHEITA", "CONSERVACAO", "PRAGAS", "CONSELHOS", "SEGURANCA_MAR",
    "MANUSEAMENTO", "NAVEGACAO", "MANUTENCAO", "SUSTENTAVEL", "TECNICA", "CURSO", "TUTORIAL",
    "VIDEO", "NEGOCIOS", "FOTOGRAFIA", "PRECOS", "VENDAS",
  ],
  CommunityPostKind: ["CONHECIMENTO", "VENDA_COLETIVA", "COMPRA_COLETIVA", "PARTILHA_EQUIPAMENTO", "EVENTO", "AVISO"],
};

for (const [nome, valores] of Object.entries(LISTAS)) {
  if (prisma[nome]) continue;
  const obj = {};
  for (const v of valores) obj[v] = v;
  try {
    Object.defineProperty(prisma, nome, { value: Object.freeze(obj), enumerable: true, configurable: true });
  } catch (e) {
    console.error("Aviso: nao foi possivel definir " + nome);
  }
}
