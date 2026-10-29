export const DEPARTMENT_ICON: Record<string, string> = {
  AGRICULTURA: "🌾",
  PESCA: "🐟",
  ARTESANATO: "🧺",
  COMERCIO: "🏪",
  OUTRO: "📦",
};

export const MODERATION_STATUS_COLOR: Record<string, string> = {
  APROVADO: "#2E7D32",
  ATENCAO: "#EF6C00",
  REJEITADO: "#C62828",
  REMOVIDO: "#C62828",
};

export const MODERATION_STATUS_LABEL: Record<string, string> = {
  APROVADO: "Aprovado",
  ATENCAO: "Com aviso de qualidade",
  REJEITADO: "Rejeitado",
  REMOVIDO: "Removido",
};

export const QUALITY_ICON: Record<string, string> = {
  SEM_FOTO: "📷",
  SEM_DESCRICAO: "📝",
  SEM_PRECO: "💲",
  PRECO_ESTRANHO: "🤔",
  TITULO_CURTO: "🔤",
  DUPLICADO: "📑",
  SEM_STOCK: "📦",
};

// Filas do mercado: cada uma é um filtro já pronto
export const MARKET_QUEUES: { key: string; label: string; status: string }[] = [
  { key: "review", label: "🆕 Para rever", status: "REVISAO" },
  { key: "reported", label: "🚩 Denunciados", status: "DENUNCIADO" },
  { key: "attention", label: "⚠️ Com aviso", status: "ATENCAO" },
  { key: "visible", label: "✅ Visíveis", status: "VISIVEL" },
  { key: "hidden", label: "🙈 Escondidos", status: "ESCONDIDO" },
  { key: "rejected", label: "⛔ Rejeitados", status: "REJEITADO" },
  { key: "removed", label: "🗑️ Removidos", status: "REMOVIDO" },
  { key: "featured", label: "⭐ Em destaque", status: "DESTAQUE" },
  { key: "all", label: "Todos", status: "" },
];

export const FEATURE_DAYS = [3, 7, 14, 30, 60, 90];

export function priceText(price: any, unit?: string | null): string {
  if (price === null || price === undefined || Number(price) <= 0) return "Preço a combinar";
  const value = `${Math.round(Number(price)).toLocaleString("pt-PT")} FCFA`;
  return unit ? `${value} / ${unit}` : value;
}
