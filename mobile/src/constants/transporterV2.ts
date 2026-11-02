export const TR_TABS: { key: string; icon: string; label: string }[] = [
  { key: "TrHome", icon: "🏠", label: "Início" },
  { key: "TrDeliveries", icon: "📦", label: "Entregas" },
  { key: "TrMap", icon: "🗺️", label: "Mapa" },
  { key: "TrEarnings", icon: "💰", label: "Ganhos" },
  { key: "TrProfile", icon: "👤", label: "Perfil" },
];

export const TR_VEHICLE_ICON: Record<string, string> = {
  MOTO: "🏍️",
  TRICICLO: "🛺",
  CARRO: "🚗",
  CARRINHA: "🚐",
  CAMIAO: "🚚",
  BARCO: "🛶",
  OUTRO: "🚛",
};

export const TR_CARGO_ICON: Record<string, string> = {
  AGRICOLA: "🌾",
  PESCA: "🐟",
  ARTESANATO: "🧺",
  COMERCIAL: "🏪",
  CONSTRUCAO: "🧱",
  VESTUARIO_EQUIPAMENTOS: "👕",
  VEICULOS_PECAS: "🔧",
  OUTRA: "📦",
};

export const TR_KIND_ICON: Record<string, string> = {
  INDEPENDENTE: "🧑",
  EMPRESA: "🏢",
  COOPERATIVA: "🤲",
};

export const TR_VEHICLE_STATUS_COLOR: Record<string, string> = {
  OPERACIONAL: "#2E7D32",
  MANUTENCAO: "#EF6C00",
  AVARIADO: "#C62828",
};

export const TR_VEHICLE_STATUS_ICON: Record<string, string> = {
  OPERACIONAL: "✅",
  MANUTENCAO: "🔧",
  AVARIADO: "⛔",
};

export const TR_VERIFICATION_COLOR: Record<string, string> = {
  RASCUNHO: "#757575",
  PENDENTE: "#F9A825",
  APROVADO: "#2E7D32",
  RECUSADO: "#C62828",
};

export const TR_PHASE_ICON: Record<string, string> = {
  DISPONIVEL: "🆕",
  ACEITE: "📋",
  EM_TRANSPORTE: "🚚",
  ENTREGUE: "✅",
  CANCELADA: "🚫",
};

export const TR_PHASE_COLOR: Record<string, string> = {
  DISPONIVEL: "#1565C0",
  ACEITE: "#EF6C00",
  EM_TRANSPORTE: "#6A1B9A",
  ENTREGUE: "#2E7D32",
  CANCELADA: "#757575",
};

export const TR_BADGE: Record<string, { icon: string; color: string }> = {
  NOVO: { icon: "🌱", color: "#757575" },
  CONFIAVEL: { icon: "✅", color: "#1565C0" },
  EXCELENTE: { icon: "🏆", color: "#F9A825" },
};

export function trKmText(km: number | null | undefined, approx?: boolean): string | null {
  if (km === null || km === undefined) return null;
  return `${approx ? "≈ " : ""}${String(km).replace(".", ",")} km`;
}

export function trEtaText(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function trWeightText(kg: number | null | undefined, partial?: boolean): string | null {
  if (kg === null || kg === undefined || kg <= 0) return partial ? "peso por confirmar" : null;
  const text = kg >= 1000 ? `${String(Math.round(kg) / 1000).replace(".", ",")} t` : `${String(kg).replace(".", ",")} kg`;
  return partial ? `${text}+` : text;
}

export function trPlaceLabel(place: any, fallback: string): string {
  if (!place) return fallback;
  const text = place.text ?? null;
  const region = place.regionName ?? null;
  if (text && region && !String(text).toLowerCase().includes(String(region).toLowerCase())) return `${text} (${region})`;
  return text ?? region ?? fallback;
}

// Abrir o percurso na aplicação de mapas do telemóvel
export function trDirectionsUrl(place: any): string | null {
  if (!place) return null;
  if (place.lat !== null && place.lat !== undefined && place.lng !== null && place.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  }
  const query = [place.text, place.regionName, "Guiné-Bissau"].filter(Boolean).join(", ");
  return place.text || place.regionName ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function trStars(n: number | null | undefined): string {
  const full = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

// Porque o veículo ainda não pode aceitar entregas (as mesmas razões que o servidor usa)
export function trVehicleReasons(profile: any): string[] {
  if (!profile) return [];
  if (!profile.vehicleType) return ["SEM_VEICULO"];

  const reasons: string[] = [];
  if (profile.vehicleStatus && profile.vehicleStatus !== "OPERACIONAL") reasons.push("VEICULO_INDISPONIVEL");
  if (!profile.capacityKg) reasons.push("SEM_CAPACIDADE");
  return reasons;
}
