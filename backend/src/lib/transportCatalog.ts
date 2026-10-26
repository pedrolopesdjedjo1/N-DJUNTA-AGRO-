import { Option } from "./ngoCatalog";
import { stageOf } from "./agentOpsCatalog";

export const VEHICLE_TYPES: Option[] = [
  { value: "MOTO", label: "Mota" },
  { value: "TRICICLO", label: "Triciclo ou moto-carga" },
  { value: "CARRINHA", label: "Carrinha" },
  { value: "CAMIAO", label: "Camião" },
  { value: "BARCO", label: "Barco ou canoa" },
  { value: "OUTRO", label: "Outro veículo" },
];

export const DELIVERY_PHASES: Option[] = [
  { value: "DISPONIVEL", label: "Disponível" },
  { value: "ACEITE", label: "Aceite, por recolher" },
  { value: "EM_TRANSPORTE", label: "Em transporte" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const PROBLEM_KINDS: Option[] = [
  { value: "CLIENTE_AUSENTE", label: "Cliente ausente" },
  { value: "ENDERECO", label: "Não encontro o endereço" },
  { value: "PRODUTO_DANIFICADO", label: "Produto danificado" },
  { value: "ATRASO", label: "Atraso" },
  { value: "VEICULO", label: "Avaria do veículo" },
  { value: "ESTRADA", label: "Estrada bloqueada ou em mau estado" },
  { value: "PAGAMENTO", label: "Problema de pagamento" },
  { value: "OUTRO", label: "Outro problema" },
];

export const RELEASE_REASONS: Option[] = [
  { value: "VEICULO", label: "O meu veículo avariou" },
  { value: "CARGA", label: "A carga é grande demais" },
  { value: "DISTANCIA", label: "Fica longe demais" },
  { value: "IMPREVISTO", label: "Tive um imprevisto" },
  { value: "OUTRO", label: "Outro motivo" },
];

export const EVENT_KINDS: Option[] = [
  { value: "ACEITE", label: "Entrega aceite" },
  { value: "DESISTIU", label: "Entrega devolvida" },
  { value: "RECOLHIDA", label: "Produtos recolhidos" },
  { value: "ENTREGUE", label: "Entrega concluída" },
  { value: "PROBLEMA", label: "Problema comunicado" },
];

export const DELIVERY_SORTS: Option[] = [
  { value: "RECENTE", label: "Mais recentes" },
  { value: "VALOR", label: "Maior valor" },
  { value: "PERTO", label: "Mais perto" },
];

// Estados que o servidor grava. CONFIRMAR na ligação com o schema.prisma:
// se um nome não existir no enum, o npx tsc --noEmit aponta a linha.
export const DELIVERY_WRITE = {
  PENDING: "PENDENTE",
  ACCEPTED: "ACEITA",
  IN_TRANSIT: "EM_TRANSPORTE",
  DELIVERED: "ENTREGUE",
} as const;

export const ORDER_WRITE = {
  DELIVERED: "ENTREGUE",
} as const;

// Onde procurar o texto e as coordenadas da recolha e do destino (na entrega ou na encomenda)
export const PICKUP_TEXT = ["pickupAddress", "pickupLocation", "pickup", "originAddress", "origin", "fromAddress"];
export const PICKUP_LAT = ["pickupLat", "originLat", "fromLat"];
export const PICKUP_LNG = ["pickupLng", "originLng", "fromLng"];
export const DEST_TEXT = ["deliveryAddress", "destinationAddress", "destination", "shippingAddress", "address", "toAddress", "deliveryLocation"];
export const DEST_LAT = ["destLat", "destinationLat", "deliveryLat", "toLat", "addressLat"];
export const DEST_LNG = ["destLng", "destinationLng", "deliveryLng", "toLng", "addressLng"];

export const KG_FACTOR: Record<string, number> = { kg: 1, kilo: 1, kilos: 1, tonelada: 1000, toneladas: 1000, ton: 1000 };

export function pickText(rows: any[], keys: string[]): string | null {
  for (const row of rows) {
    if (!row) continue;
    for (const key of keys) {
      const v = row[key];
      if (typeof v === "string" && v.trim()) return v.trim().slice(0, 200);
    }
  }
  return null;
}

export function pickNumber(rows: any[], keys: string[]): number | null {
  for (const row of rows) {
    if (!row) continue;
    for (const key of keys) {
      const v = row[key];
      if (v !== null && v !== undefined && v !== "" && !isNaN(Number(v))) return Number(v);
    }
  }
  return null;
}

// Em que fase está uma entrega, seja qual for o nome exato do estado guardado
export function deliveryPhase(d: any, order?: any): string {
  const s = String(d?.status ?? "").toUpperCase();

  if (order && stageOf(order.status) === "CANCELADA") return "CANCELADA";
  if (s.includes("CANCEL") || s.includes("RECUS") || s.includes("FALH")) return "CANCELADA";
  if (s.includes("ENTREGUE") || s.includes("CONCLU")) return "ENTREGUE";
  if (order && stageOf(order.status) === "CONCLUIDA") return "ENTREGUE";
  if (!d?.transporterId) return "DISPONIVEL";
  if (s.includes("TRANSIT") || s.includes("TRANSPORT") || s.includes("CAMINHO") || s.includes("RECOLH")) return "EM_TRANSPORTE";
  return "ACEITE";
}

// Distância em quilómetros entre dois pontos
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function transportCatalog() {
  return {
    vehicleTypes: VEHICLE_TYPES,
    deliveryPhases: DELIVERY_PHASES,
    problemKinds: PROBLEM_KINDS,
    releaseReasons: RELEASE_REASONS,
    eventKinds: EVENT_KINDS,
    deliverySorts: DELIVERY_SORTS,
  };
}
