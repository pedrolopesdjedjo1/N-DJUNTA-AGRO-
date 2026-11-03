import { Pos } from "./trLocation";

// Abrir um local (com coordenadas exatas, ou pelo nome e a região)
export function pointUrl(p: any): string | null {
  if (!p) return null;

  const exact = p.exact === undefined ? true : !!p.exact;
  if (exact && p.lat !== null && p.lat !== undefined && p.lng !== null && p.lng !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }

  const query = [p.name ?? p.text, p.address, p.regionName, "Guiné-Bissau"].filter(Boolean).join(", ");
  return String(p.name ?? p.text ?? p.address ?? p.regionName ?? "").trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function token(p: any): string | null {
  if (!p) return null;
  if (p.exact && p.lat !== null && p.lat !== undefined && p.lng !== null && p.lng !== undefined) return `${p.lat},${p.lng}`;

  const text = [p.text, p.regionName, "Guiné-Bissau"].filter(Boolean).join(", ");
  return String(p.text ?? p.regionName ?? "").trim() ? text : null;
}

// A rota completa, com todas as paragens, aberta no Google Maps
export function routeUrl(places: any[], origin?: Pos | null): string | null {
  const tokens = places.map(token).filter((t): t is string => !!t);
  if (tokens.length === 0) return null;

  const destination = tokens[tokens.length - 1];
  const waypoints = tokens.slice(0, -1).slice(0, 8);

  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(destination)}`;
  if (origin) url += `&origin=${origin.lat},${origin.lng}`;
  if (waypoints.length > 0) url += `&waypoints=${encodeURIComponent(waypoints.join("|"))}`;
  return url;
}

export function kmLabel(km: number | null | undefined, approx = true): string | null {
  if (km === null || km === undefined) return null;
  return `${approx ? "≈ " : ""}${String(km).replace(".", ",")} km`;
}
