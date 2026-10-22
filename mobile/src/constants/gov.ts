export const SEVERITY_COLOR: Record<string, string> = {
  INFO: "#1565C0",
  ATENCAO: "#F9A825",
  ALERTA: "#EF6C00",
  EMERGENCIA: "#C62828",
};

export const SEVERITY_ICON: Record<string, string> = {
  INFO: "ℹ️",
  ATENCAO: "⚠️",
  ALERTA: "🚨",
  EMERGENCIA: "🆘",
};

export const ALERT_KIND_ICON: Record<string, string> = {
  CHUVA: "🌧️",
  SECA: "☀️",
  TEMPESTADE: "⛈️",
  INUNDACAO: "🌊",
  AGRICOLA: "🌾",
  MARITIMO: "⚓",
  EMERGENCIA: "🆘",
  OUTRO: "📢",
};

export const ALERT_STATE: Record<string, { label: string; color: string }> = {
  ATIVO: { label: "Ativo", color: "#2E7D32" },
  AGENDADO: { label: "Agendado", color: "#1565C0" },
  EXPIRADO: { label: "Expirado", color: "#757575" },
  TERMINADO: { label: "Terminado", color: "#757575" },
};

export const SERVICE_STATUS_COLOR: Record<string, string> = {
  DISPONIVEL: "#2E7D32",
  POR_MARCACAO: "#1565C0",
  TEMPORARIO: "#F9A825",
  ENCERRADO: "#757575",
};

export const SERVICE_ICON: Record<string, string> = {
  DOCUMENTOS: "📄",
  AGRICULTURA: "🌾",
  PESCA: "🎣",
  COMERCIO: "🏪",
  AMBIENTE: "🌳",
  TERRAS: "🗺️",
  SAUDE: "🏥",
  EDUCACAO: "🎓",
  FORMACAO_EMPREGO: "💼",
  APOIO_SOCIAL: "🤝",
  OUTRO: "🏛️",
};

export const PLACE_KIND_ICON: Record<string, string> = {
  INFRAESTRUTURA: "🏗️",
  MERCADO: "🛒",
  ZONA_PRODUCAO: "🌾",
};

export const PLACE_STATUS_COLOR: Record<string, string> = {
  OPERACIONAL: "#2E7D32",
  DANIFICADA: "#C62828",
  EM_CONSTRUCAO: "#F9A825",
  ENCERRADA: "#757575",
};

export const REPORT_STATUS_COLOR: Record<string, string> = {
  RECEBIDO: "#F9A825",
  EM_ANALISE: "#1565C0",
  ENCAMINHADO: "#6A1B9A",
  RESOLVIDO: "#2E7D32",
  REJEITADO: "#C62828",
};

export const REPORT_ICON: Record<string, string> = {
  PEDIDO_APOIO: "🙋",
  PROBLEMA_AGRICOLA: "🌾",
  PROBLEMA_PESCA: "🎣",
  INFRAESTRUTURA: "🏗️",
  MERCADO: "🛒",
  DENUNCIA: "🚩",
  SUGESTAO: "💡",
};

export const GOV_PUBLICATION_ICON: Record<string, string> = {
  COMUNICADO: "📣",
  AVISO: "🚨",
  INFORMACAO: "ℹ️",
};
