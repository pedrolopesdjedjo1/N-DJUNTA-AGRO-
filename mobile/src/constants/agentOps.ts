export const STAGE_COLOR: Record<string, string> = {
  NOVA: "#F9A825",
  CONFIRMADA: "#1565C0",
  PREPARACAO: "#6A1B9A",
  PRONTO: "#00838F",
  TRANSPORTE: "#EF6C00",
  ENTREGUE: "#2E7D32",
  CONCLUIDA: "#2E7D32",
  CANCELADA: "#757575",
};

export const STAGE_ICON: Record<string, string> = {
  NOVA: "🆕",
  CONFIRMADA: "✅",
  PREPARACAO: "🧑‍🍳",
  PRONTO: "📦",
  TRANSPORTE: "🚚",
  ENTREGUE: "📬",
  CONCLUIDA: "🏁",
  CANCELADA: "🚫",
};

export const DEPARTMENT_LABEL: Record<string, string> = {
  AGRICULTURA: "🌾 Agricultura",
  PESCA: "🐟 Pesca",
  ARTESANATO: "🧺 Artesanato",
  COMERCIO: "🏪 Comércio",
  OUTRO: "📦 Outros",
};

export const ACTION_ICON: Record<string, string> = {
  CONFIRMOU_COMPRADOR: "✅",
  CONFIRMOU_VENDEDOR: "✅",
  CONTACTOU_COMPRADOR: "📞",
  CONTACTOU_VENDEDOR: "📞",
  ACOMPANHOU_PREPARACAO: "🧑‍🍳",
  ACOMPANHOU_TRANSPORTE: "🚚",
  ACOMPANHOU_ENTREGA: "📬",
  NOTA: "📝",
};

// "#A1B2C3" a partir do número da encomenda
export function shortId(id: any): string {
  return `#${String(id ?? "").slice(-6).toUpperCase()}`;
}

// "EM_TRANSPORTE" passa a "Em transporte"
export function humanize(value: any): string {
  const text = String(value ?? "").replace(/_/g, " ").toLowerCase().trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

export function minutesText(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "sem localização";
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} dia(s)`;
}
