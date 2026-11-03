import { Option } from "./ngoCatalog";

export const EXPENSE_KINDS: Option[] = [
  { value: "COMBUSTIVEL", label: "Combustível" },
  { value: "MANUTENCAO", label: "Manutenção e reparações" },
  { value: "PECAS", label: "Peças e pneus" },
  { value: "PORTAGEM", label: "Taxas e portagens" },
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "ESTACIONAMENTO", label: "Estacionamento" },
  { value: "SEGURO", label: "Seguro e documentos" },
  { value: "OUTRO", label: "Outras despesas" },
];

export const PAYOUT_STATUS: Option[] = [
  { value: "PENDENTE", label: "Por receber" },
  { value: "RECEBIDO", label: "Recebido" },
  { value: "CONTESTADO", label: "Não recebido (reclamado)" },
];

export const PAYMENT_METHODS: Option[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "DINHEIRO_MOVEL", label: "Dinheiro móvel" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "OUTRO", label: "Outra forma" },
];

export const CONTACT_VIA: Option[] = [
  { value: "CHAMADA", label: "Chamada" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MENSAGEM", label: "Mensagem no app" },
];

export const DIRECTORY_KINDS: { value: string; label: string; icon: string; roles: string[] | "BUYER" }[] = [
  { value: "AGRICULTORES", label: "Agricultores", icon: "🌾", roles: ["AGRICULTOR"] },
  { value: "PESCADORES", label: "Pescadores", icon: "🎣", roles: ["PESCADOR"] },
  { value: "ARTESAOS", label: "Artesãos", icon: "🧺", roles: ["ARTESAO"] },
  { value: "COMERCIANTES", label: "Comerciantes", icon: "🏪", roles: ["COMERCIANTE"] },
  { value: "COMPRADORES", label: "Compradores", icon: "🛒", roles: "BUYER" },
  { value: "AGENTES", label: "Agentes", icon: "🤝", roles: ["AGENTE"] },
];

export const OFFER_STATUS: Option[] = [
  { value: "ATIVA", label: "Ativa" },
  { value: "ENCERRADA", label: "Encerrada" },
];

export const REQUEST_STATUS: Option[] = [
  { value: "PENDENTE", label: "Por responder" },
  { value: "ACEITE", label: "Aceite" },
  { value: "RECUSADA", label: "Recusada" },
];

export const BADGES: Option[] = [
  { value: "NOVO", label: "Transportador novo" },
  { value: "CONFIAVEL", label: "Transportador de confiança" },
  { value: "EXCELENTE", label: "Transportador excelente" },
];

// A classificação do transportador, pelas entregas feitas e pela média das avaliações
export function badgeOf(delivered: number, average: number | null): string {
  if (delivered >= 30 && average !== null && average >= 4.5) return "EXCELENTE";
  if (delivered >= 10 && average !== null && average >= 4) return "CONFIAVEL";
  return "NOVO";
}

export function transportBusinessCatalog() {
  return {
    expenseKinds: EXPENSE_KINDS,
    payoutStatus: PAYOUT_STATUS,
    paymentMethods: PAYMENT_METHODS,
    contactVia: CONTACT_VIA,
    directoryKinds: DIRECTORY_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon })),
    offerStatus: OFFER_STATUS,
    requestStatus: REQUEST_STATUS,
    badges: BADGES,
  };
}
