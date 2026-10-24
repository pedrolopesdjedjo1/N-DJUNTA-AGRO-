import { Option } from "./ngoCatalog";

export const COMMISSION_STATUS: Option[] = [
  { value: "PENDENTE", label: "A receber" },
  { value: "PAGO", label: "Pago" },
  { value: "ANULADO", label: "Anulado" },
];

export const COMMISSION_REASONS: Option[] = [
  { value: "COMPRA_ASSISTIDA", label: "Compra feita com a sua ajuda" },
  { value: "VENDA_CLIENTE", label: "Venda de um cliente que registou" },
];

export const SECURITY_KINDS: Option[] = [
  { value: "CONTA_SUSPEITA", label: "Conta suspeita" },
  { value: "FRAUDE", label: "Fraude ou engano" },
  { value: "ABUSO", label: "Abuso ou ameaça" },
  { value: "ACESSO_INDEVIDO", label: "Acesso indevido a uma conta" },
  { value: "DADOS_FALSOS", label: "Dados falsos" },
  { value: "OUTRO", label: "Outro problema" },
];

export const SECURITY_STATUS: Option[] = [
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "RESOLVIDO", label: "Resolvido" },
];

// Uma venda de um cliente registado pelo agente conta durante 90 dias após o registo
export const COMMISSION_WINDOW_DAYS = 90;

// Só se calculam comissões de encomendas concluídas nos últimos 120 dias
export const RECONCILE_DAYS = 120;

export function agentFinanceCatalog() {
  return {
    commissionStatus: COMMISSION_STATUS,
    commissionReasons: COMMISSION_REASONS,
    securityKinds: SECURITY_KINDS,
    securityStatus: SECURITY_STATUS,
  };
}
