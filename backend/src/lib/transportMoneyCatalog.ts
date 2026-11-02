import { Option } from "./ngoCatalog";

export const PAYOUT_STATUS: Option[] = [
  { value: "PENDENTE", label: "Por receber" },
  { value: "RECEBIDO", label: "Recebido" },
  { value: "CONTESTADO", label: "Não recebi" },
];

export const PAY_METHODS: Option[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "DINHEIRO_MOVEL", label: "Dinheiro móvel" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "OUTRO", label: "Outro" },
];

export const EXPENSE_KINDS: Option[] = [
  { value: "COMBUSTIVEL", label: "Combustível" },
  { value: "MANUTENCAO", label: "Manutenção e reparações" },
  { value: "PECAS", label: "Peças e pneus" },
  { value: "ESTACIONAMENTO", label: "Estacionamento" },
  { value: "TAXAS", label: "Taxas e portagens" },
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "OUTRA", label: "Outra despesa" },
];

export const OFFER_STATUS: Option[] = [
  { value: "ATIVA", label: "Ativa" },
  { value: "ENCERRADA", label: "Encerrada" },
];

export const PROPOSAL_STATUS: Option[] = [
  { value: "PENDENTE", label: "Por responder" },
  { value: "ACEITA", label: "Aceite" },
  { value: "RECUSADA", label: "Recusada" },
];

export const CONTACT_VIA: Option[] = [
  { value: "CHAMADA", label: "Chamada" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MENSAGEM", label: "Mensagem no app" },
  { value: "PRESENCIAL", label: "Pessoalmente" },
];

export const PARTY_SIDES: Option[] = [
  { value: "BUYER", label: "Comprador" },
  { value: "SELLER", label: "Vendedor" },
];

// Com quem um transportador pode falar (nunca mostra telefones)
export const DIRECTORY_KINDS: { value: string; label: string; icon: string; roles: string[] | "BUYER" | "AGENT" }[] = [
  { value: "AGRICULTORES", label: "Agricultores", icon: "🌾", roles: ["AGRICULTOR"] },
  { value: "PESCADORES", label: "Pescadores", icon: "🎣", roles: ["PESCADOR"] },
  { value: "ARTESAOS", label: "Artesãos", icon: "🧺", roles: ["ARTESAO"] },
  { value: "COMERCIANTES", label: "Comerciantes", icon: "🏪", roles: ["COMERCIANTE"] },
  { value: "COMPRADORES", label: "Compradores", icon: "🛒", roles: "BUYER" },
  { value: "AGENTES", label: "Agentes", icon: "🤝", roles: "AGENT" },
];

export const BADGES: Record<string, { label: string; icon: string; hint: string }> = {
  NOVO: { label: "Transportador novo", icon: "🌱", hint: "Faça as primeiras entregas para ganhar reputação." },
  CONFIAVEL: { label: "Transportador de confiança", icon: "🤝", hint: "Pelo menos 10 entregas com boas avaliações." },
  EXCELENTE: { label: "Transportador excelente", icon: "🏆", hint: "Mais de 30 entregas, avaliação alta e poucos cancelamentos." },
};

export function transportMoneyCatalog() {
  return {
    payoutStatus: PAYOUT_STATUS,
    payMethods: PAY_METHODS,
    expenseKinds: EXPENSE_KINDS,
    offerStatus: OFFER_STATUS,
    proposalStatus: PROPOSAL_STATUS,
    contactVia: CONTACT_VIA,
    partySides: PARTY_SIDES,
    directoryKinds: DIRECTORY_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon })),
    badges: BADGES,
  };
}
