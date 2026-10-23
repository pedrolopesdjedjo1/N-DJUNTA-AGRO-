import { Option } from "./ngoCatalog";

function plain(value: any): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Povoações da previsão do tempo e a região do Governo a que pertencem
const TOWN_TO_REGION: Record<string, string> = {
  bissau: "BISSAU",
  quinhamel: "BIOMBO",
  cacheu: "CACHEU",
  canchungo: "CACHEU",
  farim: "OIO",
  mansoa: "OIO",
  bissora: "OIO",
  bafata: "BAFATA",
  gabu: "GABU",
  buba: "QUINARA",
  catio: "TOMBALI",
  bolama: "BOLAMA",
  bubaque: "BOLAMA",
};

// Zonas marítimas e as regiões da costa que cada uma toca
export const ZONE_TO_REGIONS: Record<string, string[]> = {
  norte: ["CACHEU"],
  centro: ["BISSAU", "BIOMBO"],
  bijagos: ["BOLAMA"],
  sul: ["TOMBALI", "QUINARA"],
};

export function regionKeyOfTown(name?: string | null): string | null {
  return TOWN_TO_REGION[plain(name)] ?? null;
}

// A quem chega cada tipo de alerta (o servidor decide da mesma forma)
export const AUDIENCE_TEXT: Record<string, string> = {
  AGRICOLA: "agricultores",
  MARITIMO: "pescadores",
  CHUVA: "agricultores e pescadores",
  SECA: "agricultores e pescadores",
  TEMPESTADE: "toda a gente",
  INUNDACAO: "toda a gente",
  EMERGENCIA: "toda a gente",
  OUTRO: "agricultores, pescadores e artesãos",
};

export interface DurationChoice {
  key: string;
  label: string;
  hours?: number;
}

export const DURATIONS: DurationChoice[] = [
  { key: "auto", label: "Automático" },
  { key: "6", label: "6 horas", hours: 6 },
  { key: "24", label: "24 horas", hours: 24 },
  { key: "72", label: "3 dias", hours: 72 },
  { key: "168", label: "7 dias", hours: 168 },
  { key: "720", label: "30 dias", hours: 720 },
  { key: "none", label: "Sem data de fim" },
  { key: "custom", label: "Escolher data" },
];

// Transforma um aviso automático da previsão num alerta oficial já preenchido
export function alertFromForecast(a: { level: string; kind: string; title: string; detail: string }) {
  const t = plain(a.title);
  let kind = "OUTRO";

  if (a.kind === "AGRICOLA") kind = t.includes("pouca chuva") ? "SECA" : "AGRICOLA";
  else if (t.includes("tempestade")) kind = "TEMPESTADE";
  else if (t.includes("chuva")) kind = "CHUVA";
  else if (t.includes("vento")) kind = "TEMPESTADE";

  return {
    kind,
    severity: a.level === "ALTA" ? "ALERTA" : "ATENCAO",
    title: a.title,
    message: a.detail,
  };
}

export function hoursText(hours: number): string {
  if (hours >= 48) return `${Math.ceil(hours / 24)} dias`;
  return `${hours} hora(s)`;
}

export function optionLabel(list: Option[], value?: string | null): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.label ?? value;
}
