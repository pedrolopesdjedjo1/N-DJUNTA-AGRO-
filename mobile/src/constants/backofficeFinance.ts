export const PAY_STATE_COLOR: Record<string, string> = {
  PENDENTE: "#F9A825",
  CONFIRMADO: "#2E7D32",
  FALHADO: "#C62828",
};

export const REFUND_COLOR: Record<string, string> = {
  PENDENTE: "#F9A825",
  APROVADO: "#1565C0",
  RECUSADO: "#C62828",
  PAGO: "#2E7D32",
};

export const TRANSACTION_ICON: Record<string, string> = {
  PAGAMENTO: "💳",
  REEMBOLSO: "↩️",
  COMISSAO: "🤝",
};

export const FLAG_ICON: Record<string, string> = {
  BIG: "💰",
  DUP_REF: "🔁",
  CANCEL_STREAK: "🚫",
  SELF: "🪞",
  SAME_PHONE: "📞",
  BURST: "⚡",
  REFUNDS: "↩️",
};

export const FLAG_LEVEL_COLOR: Record<string, string> = {
  ALTA: "#C62828",
  MEDIA: "#EF6C00",
};

export const FINANCE_MENU: [string, string, string, Record<string, any> | undefined, string[]][] = [
  ["📈", "Vendas", "BoSales", undefined, ["finance.view", "stats.view"]],
  ["💳", "Pagamentos", "BoPayments", undefined, ["finance.view"]],
  ["🧾", "Transações", "BoTransactions", undefined, ["finance.view"]],
  ["🤝", "Comissões dos agentes", "BoCommissions", undefined, ["finance.view"]],
  ["↩️", "Reembolsos", "BoRefunds", undefined, ["finance.view"]],
  ["🚨", "Transações suspeitas", "BoFlags", undefined, ["finance.view"]],
  ["📑", "Relatório financeiro", "BoFinanceReport", undefined, ["finance.view", "stats.view"]],
];

// "#A1B2C3" a partir do número da encomenda
export function orderCodeOf(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}
