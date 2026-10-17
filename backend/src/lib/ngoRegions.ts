export interface RegionDef {
  key: string;
  name: string;
  lat: number;
  lng: number;
  keywords: string[];
}

// Regiões da Guiné-Bissau, com um ponto de referência (a sede ou uma vila principal)
export const REGIONS: RegionDef[] = [
  { key: "BISSAU", name: "Bissau (SAB)", lat: 11.8636, lng: -15.5977, keywords: ["bissau"] },
  { key: "BIOMBO", name: "Biombo", lat: 11.8833, lng: -15.85, keywords: ["biombo", "quinhamel", "prabis", "safim"] },
  {
    key: "CACHEU",
    name: "Cacheu",
    lat: 12.2667,
    lng: -16.1667,
    keywords: ["cacheu", "canchungo", "caio", "bula", "sao domingos", "varela", "bigene"],
  },
  { key: "OIO", name: "Oio", lat: 12.0667, lng: -15.3167, keywords: ["oio", "farim", "mansoa", "bissora", "nhacra", "encheia"] },
  {
    key: "BAFATA",
    name: "Bafatá",
    lat: 12.1667,
    lng: -14.6667,
    keywords: ["bafata", "bambadinca", "contuboel", "galomaro", "gamamundo", "xitole"],
  },
  { key: "GABU", name: "Gabú", lat: 12.2833, lng: -14.2167, keywords: ["gabu", "pirada", "pitche", "sonaco", "boe", "paunca", "beli"] },
  { key: "QUINARA", name: "Quinara", lat: 11.5833, lng: -14.9833, keywords: ["quinara", "buba", "fulacunda", "empada", "tite"] },
  { key: "TOMBALI", name: "Tombali", lat: 11.2833, lng: -15.25, keywords: ["tombali", "catio", "cacine", "quebo", "bedanda"] },
  {
    key: "BOLAMA",
    name: "Bolama e Bijagós",
    lat: 11.5833,
    lng: -15.4667,
    keywords: ["bolama", "bijagos", "bubaque", "orango", "caravela", "uno", "canhabaque"],
  },
];

// Limites do mapa (continente e ilhas)
export const BOUNDS = { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 };

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findRegion(text?: string | null): RegionDef | null {
  const tokens = plain(text).split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const joined = ` ${tokens.join(" ")} `;
  for (const region of REGIONS) {
    for (const keyword of region.keywords) {
      if (joined.includes(` ${keyword} `)) return region;
    }
  }
  return null;
}

export function nearestRegion(lat: number, lng: number): RegionDef | null {
  let best: RegionDef | null = null;
  let bestDistance = Infinity;

  for (const region of REGIONS) {
    const d = (region.lat - lat) ** 2 + (region.lng - lng) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = region;
    }
  }
  return best;
}
