import { formatDateTime } from "./market";
import { isoToDateText, isoToTimeText } from "../utils/dates";

export const TRAINING_STATE: Record<string, { label: string; color: string }> = {
  ABERTA: { label: "Inscrições abertas", color: "#2E7D32" },
  POR_CONCLUIR: { label: "Terminou: falta concluir", color: "#EF6C00" },
  CONCLUIDA: { label: "Concluída", color: "#00838F" },
  CANCELADA: { label: "Cancelada", color: "#757575" },
};

// Estado que se mostra ao utilizador (junta o estado guardado com a data)
export function trainingState(t: any): string {
  if (!t) return "ABERTA";
  if (t.status === "CANCELADA") return "CANCELADA";
  if (t.status === "CONCLUIDA") return "CONCLUIDA";
  const end = new Date(t.endsAt ?? t.startsAt).getTime();
  return end < Date.now() ? "POR_CONCLUIR" : "ABERTA";
}

export function whenText(t: any): string {
  if (!t?.startsAt) return "";
  const start = formatDateTime(t.startsAt);
  if (!t.endsAt) return start;
  if (isoToDateText(t.startsAt) === isoToDateText(t.endsAt)) return `${start} às ${isoToTimeText(t.endsAt)}`;
  return `${start} a ${formatDateTime(t.endsAt)}`;
}

export const MATERIAL_KINDS = [
  { value: "DOCUMENTO", label: "📄 Documento (foto)" },
  { value: "VIDEO", label: "🎬 Vídeo" },
  { value: "LINK", label: "🔗 Link" },
];

export const MATERIAL_ICON: Record<string, string> = {
  DOCUMENTO: "📄",
  VIDEO: "🎬",
  LINK: "🔗",
};

export const PEOPLE_KINDS: [string, string][] = [
  ["AGRICULTORES", "🌾 Agricultores"],
  ["PESCADORES", "🎣 Pescadores"],
  ["ARTESAOS", "🧺 Artesãos"],
];
