export const CASE_STATUS_COLOR: Record<string, string> = {
  ABERTO: "#F9A825",
  EM_CURSO: "#1565C0",
  ESCALADO: "#6A1B9A",
  RESOLVIDO: "#2E7D32",
};

export const CASE_ICON: Record<string, string> = {
  ENCOMENDA: "📦",
  TRANSPORTE: "🚚",
  PAGAMENTO: "💳",
  PRODUTO: "🛍️",
  CONTA: "🔐",
  OUTRO: "⚠️",
};

export const SECURITY_ICON: Record<string, string> = {
  CONTA_SUSPEITA: "🕵️",
  FRAUDE: "🚫",
  ABUSO: "😡",
  ACESSO_INDEVIDO: "🔓",
  DADOS_FALSOS: "📄",
  OUTRO: "⚠️",
};

export const SECURITY_STATUS_COLOR: Record<string, string> = {
  ABERTO: "#F9A825",
  EM_ANALISE: "#1565C0",
  RESOLVIDO: "#2E7D32",
};

// Distância em quilómetros entre dois pontos
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kmText(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
