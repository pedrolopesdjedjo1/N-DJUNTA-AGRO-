export const COMMISSION_COLOR: Record<string, string> = {
  PENDENTE: "#F9A825",
  PAGO: "#2E7D32",
  ANULADO: "#757575",
};

export const COMMISSION_ICON: Record<string, string> = {
  COMPRA_ASSISTIDA: "🤝",
  VENDA_CLIENTE: "🏪",
};

// "2026-10" passa a "10/26"
export function monthLabel(month: string): string {
  return `${month.slice(5, 7)}/${month.slice(2, 4)}`;
}

// "2026-10-24" passa a "24/10"
export function dayLabel(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

// Início do mês e do ano, no formato AAAA-MM-DD
export function periodStarts(): { month: string; year: string } {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return { month: `${now.getFullYear()}-${p(now.getMonth() + 1)}-01`, year: `${now.getFullYear()}-01-01` };
}
