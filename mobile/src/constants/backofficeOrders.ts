export const ORDER_STAGE_LABEL: Record<string, string> = {
  NOVA: "Nova",
  CONFIRMADA: "Confirmada",
  PREPARACAO: "Em preparação",
  PRONTO: "Pronta",
  TRANSPORTE: "Em transporte",
  ENTREGUE: "Entregue",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const ORDER_PROBLEM_ICON: Record<string, string> = {
  STUCK: "⏳",
  DISPUTE: "⚖️",
  REPORTED: "🚩",
  DELIVERY_PROBLEM: "🚚",
  AGENT_CASE: "🤝",
  PAYMENT_LATE: "💳",
};

export const ORDER_PROBLEM_COLOR: Record<string, string> = {
  STUCK: "#EF6C00",
  DISPUTE: "#6A1B9A",
  REPORTED: "#C62828",
  DELIVERY_PROBLEM: "#EF6C00",
  AGENT_CASE: "#00838F",
  PAYMENT_LATE: "#F9A825",
};

export const ORDER_GROUP_ICON: Record<string, string> = {
  ALL: "📦",
  PENDING: "🆕",
  IN_PROGRESS: "🚚",
  COMPLETED: "🏁",
  CANCELLED: "🚫",
  PROBLEMS: "⚠️",
};

export const DISPUTE_STATUS_COLOR: Record<string, string> = {
  ABERTA: "#F9A825",
  EM_ANALISE: "#1565C0",
  RESOLVIDA: "#2E7D32",
};

export const DISPUTE_REASON_ICON: Record<string, string> = {
  NAO_RECEBIDO: "📭",
  DIFERENTE: "🔄",
  DANIFICADO: "💥",
  ATRASO: "⏰",
  PAGAMENTO: "💳",
  OUTRO: "📝",
};

export const DISPUTE_DECISION_ICON: Record<string, string> = {
  FAVOR_COMPRADOR: "🛒",
  FAVOR_VENDEDOR: "🏪",
  ACORDO: "🤝",
  SEM_ACAO: "🗄️",
};

// O que cada decisão significa, escrito para quem decide
export const DISPUTE_DECISION_HELP: Record<string, string> = {
  FAVOR_COMPRADOR: "O comprador tem razão. Pode indicar o valor a devolver e criar o pedido de reembolso no Financeiro.",
  FAVOR_VENDEDOR: "O vendedor tem razão. A encomenda segue como estava.",
  ACORDO: "As duas partes chegaram a um acordo. Descreva o que ficou combinado.",
  SEM_ACAO: "Fecha a disputa sem consequências para ninguém.",
};

export const DISPUTE_EVENT_ICON: Record<string, string> = {
  ABERTURA: "📣",
  MENSAGEM: "💬",
  MENSAGEM_EQUIPA: "🛡️",
  DECISAO: "⚖️",
  ATRIBUIDA: "🙋",
  NOTA: "🔒",
};

export const ORDER_HISTORY_ICON: Record<string, string> = {
  ENCOMENDA: "📦",
  PAGAMENTO: "💳",
  ENTREGA: "🚚",
  DISPUTA: "⚖️",
  NOTA: "📝",
  ADMIN: "🛡️",
};
