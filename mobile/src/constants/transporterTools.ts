export const SERVICE_ICON: Record<string, string> = {
  POSTO_COMBUSTIVEL: "⛽",
  OFICINA: "🔧",
  ESTACIONAMENTO: "🅿️",
  MANUTENCAO: "🛠️",
  ASSISTENCIA: "🚨",
};

export const SERVICE_STATUS_COLOR: Record<string, string> = {
  PENDENTE: "#F9A825",
  PUBLICADO: "#2E7D32",
  ESCONDIDO: "#757575",
};

export const TOOLS_MENU: { icon: string; label: string; route: string; params?: Record<string, any> }[] = [
  { icon: "⛽", label: "Postos de combustível", route: "TrServices", params: { kind: "POSTO_COMBUSTIVEL" } },
  { icon: "🔧", label: "Oficinas mecânicas", route: "TrServices", params: { kind: "OFICINA" } },
  { icon: "🅿️", label: "Estacionamentos", route: "TrServices", params: { kind: "ESTACIONAMENTO" } },
  { icon: "🛠️", label: "Serviços de manutenção", route: "TrServices", params: { kind: "MANUTENCAO" } },
  { icon: "🚨", label: "Assistência e reboque", route: "TrServices", params: { kind: "ASSISTENCIA" } },
  { icon: "🧾", label: "Registo de despesas do veículo", route: "TrExpenses" },
  { icon: "🦺", label: "Dicas de segurança", route: "TrSafety" },
  { icon: "🆘", label: "Solicitar assistência", route: "TrEmergency", params: { kind: "ASSISTENCIA" } },
  { icon: "➕", label: "Sugerir um local", route: "TrServiceSuggest" },
];

export const MAP_LAYERS: { key: string; icon: string; label: string }[] = [
  { key: "deliveries", icon: "📦", label: "Minhas entregas" },
  { key: "loads", icon: "🆕", label: "Cargas por perto" },
  { key: "markets", icon: "🛒", label: "Mercados" },
  { key: "services", icon: "⛽", label: "Postos e oficinas" },
  { key: "alerts", icon: "🌦️", label: "Alertas" },
];
