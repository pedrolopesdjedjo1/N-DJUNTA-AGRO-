export const BROADCAST_ICON: Record<string, string> = {
  GERAL: "📣",
  REGIAO: "📍",
  PERFIL: "👥",
  CLIMA: "🌦️",
  MARITIMO: "🌊",
  AGRICOLA: "🌾",
  ESTRADA: "🚧",
  EMERGENCIA: "🚨",
};

export const BROADCAST_HELP: Record<string, string> = {
  GERAL: "Chega a todas as pessoas com conta.",
  REGIAO: "Chega às pessoas das regiões escolhidas, de qualquer perfil (ou só dos perfis que escolher).",
  PERFIL: "Chega só aos perfis escolhidos, por exemplo só aos pescadores.",
  CLIMA: "Chuva forte, tempestade, seca... Aparece na página inicial enquanto estiver ativo.",
  MARITIMO: "Mau tempo no mar, marés e navegação. Por defeito chega a pescadores e transportadores.",
  AGRICOLA: "Pragas, doenças e época de sementeira ou colheita. Por defeito chega aos agricultores.",
  ESTRADA: "Estradas cortadas ou em mau estado. Por defeito chega a transportadores, comerciantes e agricultores.",
  EMERGENCIA: "Só para situações graves. Chega a toda a gente e pede confirmação.",
};

export const SEVERITY_ICON: Record<string, string> = {
  INFO: "ℹ️",
  ATENCAO: "⚠️",
  ALERTA: "🟠",
  EMERGENCIA: "🚨",
};

export const HOURS_OPTIONS = [6, 12, 24, 48, 72, 168];

export function hoursLabel(hours: number): string {
  return hours >= 48 ? `${Math.round(hours / 24)} dias` : `${hours} horas`;
}

export const TICKET_STATUS_COLOR: Record<string, string> = {
  ABERTO: "#F9A825",
  EM_CURSO: "#1565C0",
  RESOLVIDO: "#2E7D32",
};

export const TICKET_CATEGORY_ICON: Record<string, string> = {
  PAGAMENTO: "💳",
  ENCOMENDA: "📦",
  TECNICO: "🛠️",
  RECLAMACAO: "📣",
  EMERGENCIA: "🚨",
  OUTRO: "📝",
};

export const SETTING_GROUP_ICON: Record<string, string> = {
  Plataforma: "🏷️",
  Suporte: "🎧",
  Notificações: "🔔",
  Comissões: "💰",
  Entregas: "🚚",
  Mercado: "🛒",
  "Textos legais": "📜",
  Segurança: "🔐",
};

export const PERM_GROUP_ORDER = [
  "Painel",
  "Utilizadores",
  "Mercado",
  "Encomendas",
  "Transportes",
  "Financeiro",
  "Organizações",
  "Conteúdo",
  "Moderação",
  "Comunicação",
  "Relatórios",
  "Suporte",
  "Segurança",
  "Equipa",
  "Sistema",
];

export const STATS_MENU: [string, string, string, Record<string, any> | undefined][] = [
  ["📈", "Crescimento da plataforma", "BoStatsGrowth", undefined],
  ["🗺️", "Atividade por região", "BoStatsRegions", undefined],
  ["📑", "Relatório para partilhar", "BoStatsReport", undefined],
];

// A tela onde se vê aquilo sobre que um administrador agiu
export function auditRoute(type?: string | null, id?: string | null): [string, Record<string, any>] | null {
  if (!type || !id) return null;
  switch (type) {
    case "USER":
      return ["BoUser", { id }];
    case "ADMIN":
      return ["BoTeamMember", { userId: id }];
    case "PRODUCT":
      return ["BoProduct", { id }];
    case "ORDER":
      return ["BoOrder", { id }];
    case "DISPUTE":
      return ["BoDispute", { id }];
    case "REPORT":
      return ["BoReport", { id }];
    case "DELIVERY":
      return ["BoDelivery", { id }];
    case "COOP":
      return ["BoCoop", { id }];
    case "EVENT":
      return ["BoEvent", { id }];
    case "TICKET":
      return ["BoTicket", { id }];
    default:
      return null;
  }
}
