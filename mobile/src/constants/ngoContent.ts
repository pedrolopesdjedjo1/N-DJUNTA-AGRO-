import { formatDate, money } from "./market";

export const OPPORTUNITY_ICON: Record<string, string> = {
  BOLSA: "🎓",
  FORMACAO: "📚",
  EMPREGO: "💼",
  CONCURSO: "🏆",
  PROJETO: "📋",
  FINANCIAMENTO: "💰",
  PROGRAMA_APOIO: "🤝",
};

export const PUBLICATION_ICON: Record<string, string> = {
  NOTICIA: "📰",
  PROJETO: "📋",
  RESULTADO: "📊",
  CAMPANHA: "📣",
  EVENTO: "🎪",
  FOTO: "📷",
  VIDEO: "🎬",
  HISTORIA: "🏘️",
};

export const AMOUNT_LABEL: Record<string, string> = {
  BOLSA: "Valor da bolsa (FCFA, opcional)",
  FINANCIAMENTO: "Valor do financiamento (FCFA, opcional)",
  EMPREGO: "Salário (FCFA, opcional)",
  CONCURSO: "Prémio (FCFA, opcional)",
  PROGRAMA_APOIO: "Valor do apoio (FCFA, opcional)",
  FORMACAO: "Custo (FCFA, opcional; escreva 0 se for grátis)",
  PROJETO: "Valor (FCFA, opcional)",
};

// Estado do prazo de uma oportunidade (o servidor já diz se está fechada e quantos dias faltam)
export function deadlineInfo(o: any): { label: string; color: string } {
  if (o.status !== "ABERTA") return { label: "Fechada", color: "#757575" };
  if (o.deadline && new Date(o.deadline).getTime() < Date.now()) return { label: "Prazo terminado", color: "#757575" };
  if (o.daysLeft === null || o.daysLeft === undefined) return { label: "Aberta", color: "#2E7D32" };
  if (o.daysLeft <= 0) return { label: "Termina hoje", color: "#EF6C00" };
  if (o.daysLeft <= 3) return { label: `Termina em ${o.daysLeft} dia(s)`, color: "#EF6C00" };
  return { label: `Até ${formatDate(o.deadline)}`, color: "#2E7D32" };
}

export function amountText(amount?: number | null, kind?: string): string {
  if (amount === null || amount === undefined) return "";
  if (amount === 0 && kind === "FORMACAO") return "Gratuito";
  return money(amount);
}

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// O contacto pode ser um telefone, um e-mail ou só um texto
export function contactAction(contact?: string | null): { kind: "phone" | "email" | "text"; value: string } | null {
  const value = (contact ?? "").trim();
  if (!value) return null;
  if (EMAIL.test(value)) return { kind: "email", value };
  if (PHONE.test(value)) return { kind: "phone", value };
  return { kind: "text", value };
}
