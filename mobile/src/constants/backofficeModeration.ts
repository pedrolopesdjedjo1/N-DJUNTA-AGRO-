export const REPORT_TARGET_ICON: Record<string, string> = {
  USER: "👤",
  PRODUCT: "🛍️",
  ORDER: "📦",
  DELIVERY: "🚚",
  PUBLICATION: "📰",
  REVIEW: "⭐",
  OTHER: "📝",
};

export const REPORT_CATEGORY_ICON: Record<string, string> = {
  FRAUDE: "🚫",
  CONTEUDO_INADEQUADO: "⚠️",
  CONTA_SUSPEITA: "🕵️",
  PRODUTO_PROIBIDO: "⛔",
  RECLAMACAO: "📣",
  ABUSO: "😡",
  OUTRO: "📝",
};

export const REPORT_STATUS_COLOR: Record<string, string> = {
  ABERTA: "#F9A825",
  EM_ANALISE: "#1565C0",
  RESOLVIDA: "#2E7D32",
  ARQUIVADA: "#757575",
};

export const PRIORITY_COLOR: Record<string, string> = {
  ALTA: "#C62828",
  MEDIA: "#EF6C00",
  NORMAL: "#757575",
};

export const PRIORITY_LABEL: Record<string, string> = {
  ALTA: "Prioridade alta",
  MEDIA: "Prioridade média",
  NORMAL: "Normal",
};

// O que cada decisão faz, escrito para quem decide
export const DECISION_HELP: Record<string, string> = {
  SEM_ACAO: "Arquiva a denúncia sem consequências para ninguém.",
  AVISO: "A pessoa denunciada recebe um aviso da equipa. A conta continua a funcionar.",
  SUSPENDER: "A conta fica suspensa durante os dias escolhidos e os produtos ficam escondidos.",
  BLOQUEAR: "A conta fica bloqueada, sem prazo, e os produtos ficam escondidos. Só a equipa pode reativar.",
  REMOVER_PRODUTO: "O produto é retirado do mercado. A conta do vendedor continua a funcionar.",
};

export const DECISION_ICON: Record<string, string> = {
  SEM_ACAO: "🗄️",
  AVISO: "✉️",
  SUSPENDER: "⏳",
  BLOQUEAR: "⛔",
  REMOVER_PRODUTO: "🗑️",
};

// A tela onde se vê a coisa denunciada (algumas só existem nas próximas partes)
export function reportTargetRoute(type: string, id?: string | null): [string, Record<string, any>] | null {
  if (!id) return null;
  switch (type) {
    case "USER":
      return ["BoUser", { id }];
    case "PRODUCT":
      return ["BoProduct", { id }];
    case "ORDER":
      return ["BoOrder", { id }];
    case "DELIVERY":
      return ["BoDelivery", { id }];
    default:
      return null;
  }
}

export const REPORT_EVENT_ICON: Record<string, string> = {
  ATRIBUIDA: "🙋",
  NOTA: "📝",
  DECISAO: "⚖️",
};
