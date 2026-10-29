import { EVENT_ICON } from "./transporter";

export const BO_EVENT_ICON: Record<string, string> = { ...EVENT_ICON, TRATADO: "🛡️" };

// Quem pode ser avisado quando a equipa trata um problema de entrega
export const HANDLE_NOTIFY: { value: string; label: string }[] = [
  { value: "TRANSPORTER", label: "🚚 O transportador" },
  { value: "BUYER", label: "🛒 O comprador" },
  { value: "SELLER", label: "🏪 O vendedor" },
];

export const TRANSPORT_MENU: [string, string, string, Record<string, any>?, string[]?][] = [
  ["🚛", "Transportadores", "BoTransporters", undefined, ["transport.view"]],
  ["📦", "Todas as entregas", "BoDeliveries", undefined, ["transport.view"]],
  ["🚚", "Entregas em andamento", "BoDeliveries", { phase: "EM_TRANSPORTE" }, ["transport.view"]],
  ["✅", "Entregas concluídas", "BoDeliveries", { phase: "ENTREGUE" }, ["transport.view"]],
  ["🧭", "Rotas", "BoRoutes", undefined, ["transport.view"]],
  ["⚠️", "Problemas de entrega", "BoDeliveryProblems", undefined, ["transport.view"]],
  ["📣", "Reclamações", "BoComplaints", undefined, ["transport.view"]],
  ["⭐", "Avaliações", "BoTransportRatings", undefined, ["transport.view"]],
  ["🆔", "Verificar transportadores", "BoTransportVerification", undefined, ["transport.manage"]],
];

export function hoursText(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} dias`;
}
