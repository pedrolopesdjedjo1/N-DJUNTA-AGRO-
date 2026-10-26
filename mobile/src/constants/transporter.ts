export const PHASE_COLOR: Record<string, string> = {
  DISPONIVEL: "#1565C0",
  ACEITE: "#F9A825",
  EM_TRANSPORTE: "#EF6C00",
  ENTREGUE: "#2E7D32",
  CANCELADA: "#757575",
};

export const PHASE_ICON: Record<string, string> = {
  DISPONIVEL: "🆕",
  ACEITE: "📋",
  EM_TRANSPORTE: "🚚",
  ENTREGUE: "✅",
  CANCELADA: "🚫",
};

export const VEHICLE_ICON: Record<string, string> = {
  MOTO: "🏍️",
  TRICICLO: "🛺",
  CARRINHA: "🚐",
  CAMIAO: "🚛",
  BARCO: "🛶",
  OUTRO: "🚚",
};

export const PROBLEM_ICON: Record<string, string> = {
  CLIENTE_AUSENTE: "🚪",
  ENDERECO: "🧭",
  PRODUTO_DANIFICADO: "📦",
  ATRASO: "⏰",
  VEICULO: "🔧",
  ESTRADA: "🚧",
  PAGAMENTO: "💳",
  OUTRO: "⚠️",
};

export const EVENT_ICON: Record<string, string> = {
  ACEITE: "✅",
  DESISTIU: "↩️",
  RECOLHIDA: "📦",
  ENTREGUE: "🏁",
  PROBLEMA: "⚠️",
};

export const VERIFICATION_COLOR: Record<string, string> = {
  RASCUNHO: "#757575",
  PENDENTE: "#F9A825",
  APROVADO: "#2E7D32",
  RECUSADO: "#C62828",
};

// "≈ 320 kg" (ou "320 kg ou mais" se alguns produtos não têm o peso)
export function weightText(kg: number | null | undefined, partial?: boolean): string {
  const value = Number(kg) || 0;
  if (value <= 0) return partial ? "peso por confirmar" : "";
  const text = value >= 1000 ? `${Math.round(value / 100) / 10} t` : `${Math.round(value)} kg`;
  return partial ? `${text} ou mais` : `≈ ${text}`;
}

export function kmText(km: number | null | undefined, approx?: boolean): string {
  if (km === null || km === undefined) return "";
  const text = km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
  return approx ? `≈ ${text}` : text;
}

export function placeLabel(place: any, fallback = "Local por confirmar"): string {
  if (!place) return fallback;
  const text = place.text ? String(place.text) : "";
  const region = place.regionName ? String(place.regionName) : "";
  if (text && region && !text.toLowerCase().includes(region.toLowerCase())) return `${text}, ${region}`;
  return text || region || fallback;
}

// Endereço do Google Maps com a rota até um local
export function directionsUrl(place: any): string | null {
  if (!place) return null;
  if (place.lat !== null && place.lat !== undefined && place.lng !== null && place.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  }
  if (!place.text && !place.regionName) return null;
  const query = [place.text, place.regionName, "Guiné-Bissau"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function minutesSince(value: any): number | null {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}

export function stars(n: number): string {
  return "⭐".repeat(Math.max(0, Math.min(5, Math.round(n))));
}
