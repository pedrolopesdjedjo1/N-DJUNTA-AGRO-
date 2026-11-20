import { mapOverview } from "./transportRouteService";

// Mapa antigo do transportador (GET /api/transporter/map).
// Usa o mesmo mapa do GET /map/v2 e deixa mostrar só as camadas pedidas.
const LAYERS = ["deliveries", "loads", "markets", "services", "alerts"] as const;

export async function getTransporterMap(
  userId: string,
  role: string | undefined,
  filters: { layers?: string; scope?: string }
) {
  const data: any = await mapOverview(userId, role, {});

  const wanted = String(filters.layers ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter((l) => (LAYERS as readonly string[]).includes(l));

  if (wanted.length === 0) return data;

  const result: any = { ...data };
  LAYERS.forEach((layer) => {
    if (!wanted.includes(layer)) result[layer] = [];
  });
  return result;
}
