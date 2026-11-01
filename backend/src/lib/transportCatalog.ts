import { Option } from "./ngoCatalog";
import { stageOf } from "./agentOpsCatalog";

export const VEHICLE_TYPES: Option[] = [
  { value: "MOTO", label: "Motorizada" },
  { value: "TRICICLO", label: "Triciclo ou moto-carga" },
  { value: "CARRO", label: "Carro" },
  { value: "CARRINHA", label: "Carrinha" },
  { value: "CAMIAO", label: "Camião" },
  { value: "BARCO", label: "Barco ou canoa" },
  { value: "OUTRO", label: "Outro veículo" },
];

export const VEHICLE_STATUS: Option[] = [
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "MANUTENCAO", label: "Em manutenção" },
  { value: "AVARIADO", label: "Avariado" },
];

export const TRANSPORTER_KINDS: Option[] = [
  { value: "INDEPENDENTE", label: "Transportador independente" },
  { value: "EMPRESA", label: "Empresa de transportes" },
  { value: "COOPERATIVA", label: "Cooperativa de transporte" },
];

export const CARGO_TYPES: Option[] = [
  { value: "AGRICOLA", label: "Cargas agrícolas" },
  { value: "PESCA", label: "Produtos de pesca" },
  { value: "ARTESANATO", label: "Artesanato" },
  { value: "COMERCIAL", label: "Mercadorias comerciais" },
  { value: "CONSTRUCAO", label: "Materiais de construção" },
  { value: "VESTUARIO_EQUIPAMENTOS", label: "Vestuário, calçado e equipamentos" },
  { value: "VEICULOS_PECAS", label: "Veículos e peças" },
  { value: "OUTRA", label: "Outras mercadorias permitidas" },
];

// Porque é que uma entrega não serve ao veículo do transportador
export const COMPAT_MESSAGES: Record<string, string> = {
  SEM_VEICULO: "Registe o seu veículo no perfil para aceitar entregas.",
  VEICULO_INDISPONIVEL: "O seu veículo está marcado como em manutenção ou avariado. Volte a pô-lo operacional para aceitar entregas.",
  SEM_CAPACIDADE: "Indique a capacidade de carga do veículo (em quilos) para aceitar entregas.",
  CAPACIDADE: "A carga é maior do que a capacidade do seu veículo.",
  TIPO_DE_CARGA: "Este tipo de carga não está entre os produtos que o seu veículo pode transportar.",
};

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

// Motivos para cancelar uma entrega (antes ou depois de recolher)
export const RELEASE_REASONS: Option[] = [
  { value: "VEICULO", label: "O meu veículo avariou" },
  { value: "CARGA", label: "A carga é grande demais" },
  { value: "DISTANCIA", label: "Fica longe demais" },
  { value: "PRODUTO_NAO_PRONTO", label: "Os produtos não estavam prontos" },
  { value: "COMPRADOR_AUSENTE", label: "O comprador não aparece ou recusa" },
  { value: "ACIDENTE", label: "Tive um acidente" },
  { value: "IMPREVISTO", label: "Tive um imprevisto" },
  { value: "OUTRO", label: "Outro motivo" },
];

export const EVENT_KINDS: Option[] = [
  { value: "ACEITE", label: "Entrega aceite" },
  { value: "DESISTIU", label: "Entrega cancelada pelo transportador" },
  { value: "RECOLHIDA", label: "Produtos recolhidos" },
  { value: "INICIOU", label: "Viagem iniciada" },
  { value: "CHEGOU", label: "Chegou ao destino" },
  { value: "ENTREGUE", label: "Entrega concluída" },
  { value: "PROBLEMA", label: "Problema comunicado" },
  { value: "TRATADO", label: "Tratado pela equipa" },
];

export const DELIVERY_SORTS: Option[] = [
  { value: "RECENTE", label: "Mais recentes" },
  { value: "VALOR", label: "Maior valor" },
  { value: "PERTO", label: "Mais perto" },
];

export const TRANSPORTER_DOCUMENT_KINDS: Option[] = [
  { value: "IDENTIFICACAO", label: "Bilhete de identidade ou passaporte" },
  { value: "CARTA_CONDUCAO", label: "Carta de condução ou licença" },
  { value: "REGISTO_VEICULO", label: "Registo ou livrete do veículo" },
  { value: "SEGURO", label: "Seguro do veículo" },
  { value: "INSPECAO", label: "Inspeção do veículo" },
  { value: "OUTRO", label: "Outro documento" },
];

// Documentos que pertencem ao veículo (os outros são da pessoa)
export const VEHICLE_DOCUMENT_KINDS = ["REGISTO_VEICULO", "SEGURO", "INSPECAO"];

export const VERIFICATION_STATUS: Option[] = [
  { value: "RASCUNHO", label: "Por enviar" },
  { value: "PENDENTE", label: "Em análise" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "RECUSADO", label: "Recusado" },
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

// Velocidade média de cada veículo (km/h) e a diferença entre a linha reta e a estrada
const SPEED_KMH: Record<string, number> = { MOTO: 35, TRICICLO: 25, CARRO: 45, CARRINHA: 40, CAMIAO: 35, BARCO: 15, OUTRO: 30 };
const ROAD_FACTOR = 1.3;

// Tempo estimado em minutos, a partir da distância em linha reta
export function etaMinutes(km: number | null | undefined, vehicleType?: string | null): number | null {
  if (km === null || km === undefined) return null;
  const speed = SPEED_KMH[String(vehicleType ?? "")] ?? 30;
  return Math.max(5, Math.round(((km * ROAD_FACTOR) / speed) * 60));
}

function plainText(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// A que tipo de carga pertence um produto
export function cargoTypeOf(department?: string | null, text?: string | null): string {
  const t = plainText(text);
  if (/(construc|cimento|tijolo|madeira|ferro|areia|telha|zinco|tinta|prego)/.test(t)) return "CONSTRUCAO";
  if (/(roupa|vestuar|calcad|sapato|tecido|equipament|ferramenta|maquina)/.test(t)) return "VESTUARIO_EQUIPAMENTOS";
  if (/(veiculo|moto |pneu|peca|bateria|motor)/.test(t)) return "VEICULOS_PECAS";

  switch (department) {
    case "AGRICULTURA":
      return "AGRICOLA";
    case "PESCA":
      return "PESCA";
    case "ARTESANATO":
      return "ARTESANATO";
    case "COMERCIO":
      return "COMERCIAL";
    default:
      return "OUTRA";
  }
}

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
    vehicleStatus: VEHICLE_STATUS,
    transporterKinds: TRANSPORTER_KINDS,
    cargoTypes: CARGO_TYPES,
    compatMessages: COMPAT_MESSAGES,
    deliveryPhases: DELIVERY_PHASES,
    problemKinds: PROBLEM_KINDS,
    releaseReasons: RELEASE_REASONS,
    eventKinds: EVENT_KINDS,
    deliverySorts: DELIVERY_SORTS,
    documentKinds: TRANSPORTER_DOCUMENT_KINDS,
    vehicleDocumentKinds: VEHICLE_DOCUMENT_KINDS,
    verificationStatus: VERIFICATION_STATUS,
  };
}
