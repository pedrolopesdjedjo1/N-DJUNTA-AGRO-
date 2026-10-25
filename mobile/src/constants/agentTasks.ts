export const TASK_KIND_ICON: Record<string, string> = {
  GERAL: "☑️",
  CONTACTAR: "📞",
  VISITAR: "🚶",
  ENCOMENDA: "📦",
  DADOS: "📝",
  TRANSPORTE: "🚚",
  OPORTUNIDADE: "📢",
  PROBLEMA: "⚠️",
};

export const NEED_ICON: Record<string, string> = {
  SEMENTES: "🌱",
  EQUIPAMENTO: "🛠️",
  FORMACAO: "📚",
  FINANCIAMENTO: "💰",
  TRANSPORTE: "🚚",
  ARMAZENAMENTO: "🏚️",
  AGUA: "💧",
  MERCADO: "🛒",
  INFRAESTRUTURA: "🏗️",
  SEGURANCA: "🛟",
  OUTRO: "📍",
};

export const NEED_PRIORITY_COLOR: Record<string, string> = {
  BAIXA: "#757575",
  MEDIA: "#1565C0",
  ALTA: "#EF6C00",
  URGENTE: "#C62828",
};

export const NEED_STATUS_COLOR: Record<string, string> = {
  IDENTIFICADA: "#F9A825",
  ENCAMINHADA: "#6A1B9A",
  ATENDIDA: "#2E7D32",
};

// Calcula quantos dias faltam para uma oportunidade fechar
export function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}
