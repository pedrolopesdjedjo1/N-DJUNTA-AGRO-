import { Option } from "./ngoCatalog";

export const PAYMENT_STATES: Option[] = [
  { value: "PENDENTE", label: "Por confirmar" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "FALHADO", label: "Falhado ou devolvido" },
];

// Seja qual for o nome exato do estado guardado, diz em que situação está o pagamento
export function payState(status: any): string {
  const s = String(status ?? "").toUpperCase();
  if (s.includes("PEND") || s.includes("AGUARD")) return "PENDENTE";
  if (s.includes("CANCEL") || s.includes("FALH") || s.includes("RECUS") || s.includes("ESTORN") || s.includes("REEMB")) return "FALHADO";
  return "CONFIRMADO";
}

export const REFUND_STATUS: Option[] = [
  { value: "PENDENTE", label: "Por decidir" },
  { value: "APROVADO", label: "Aprovado, por pagar" },
  { value: "RECUSADO", label: "Recusado" },
  { value: "PAGO", label: "Pago" },
];

export const TRANSACTION_KINDS: Option[] = [
  { value: "PAGAMENTO", label: "Pagamentos de encomendas" },
  { value: "REEMBOLSO", label: "Reembolsos pagos" },
  { value: "COMISSAO", label: "Comissões de agentes pagas" },
];

export const FLAG_RULES: Option[] = [
  { value: "BIG", label: "Encomenda de valor muito alto" },
  { value: "DUP_REF", label: "Referência de pagamento repetida" },
  { value: "CANCEL_STREAK", label: "Muitas encomendas canceladas" },
  { value: "SELF", label: "Comprador e vendedor são a mesma conta" },
  { value: "SAME_PHONE", label: "Comprador e vendedor com o mesmo telefone" },
  { value: "BURST", label: "Muitas encomendas seguidas entre as mesmas pessoas" },
  { value: "REFUNDS", label: "Muitos reembolsos do mesmo comprador" },
];

export const COOP_STATUS: Option[] = [
  { value: "SEM_ANALISE", label: "Por analisar" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "SUSPENSA", label: "Suspensa" },
  { value: "RECUSADA", label: "Recusada" },
];

export const CONTENT_KINDS: Option[] = [
  { value: "PUBLICATION", label: "Publicação" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "PROJECT", label: "Projeto" },
];

export const AUDIT_ACTIONS_FINANCE: Option[] = [
  { value: "REFUND_CREATE", label: "Criou um pedido de reembolso" },
  { value: "REFUND_PAY", label: "Registou o pagamento de um reembolso" },
  { value: "COMMISSION_VOID", label: "Anulou uma comissão" },
  { value: "FLAG_REVIEW", label: "Revisou um alerta financeiro" },
  { value: "ORG_NOTIFY", label: "Avisou uma organização" },
  { value: "CONTENT_HIDE", label: "Escondeu um conteúdo" },
  { value: "CONTENT_RESTORE", label: "Repôs um conteúdo" },
  { value: "GOV_SERVICE", label: "Mudou um serviço público" },
];

export function adminFinanceCatalog() {
  return {
    paymentStates: PAYMENT_STATES,
    refundStatus: REFUND_STATUS,
    transactionKinds: TRANSACTION_KINDS,
    flagRules: FLAG_RULES,
    auditActionsFinance: AUDIT_ACTIONS_FINANCE,
  };
}

export function adminOrgsCatalog() {
  return { coopStatus: COOP_STATUS, contentKinds: CONTENT_KINDS, auditActionsFinance: AUDIT_ACTIONS_FINANCE };
}
