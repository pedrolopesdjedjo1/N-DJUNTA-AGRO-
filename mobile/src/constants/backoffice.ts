export interface AdminTab {
  key: string;
  icon: string;
  label: string;
  perms: string[];
}

// A barra principal da administração: só aparecem as abas a que a pessoa tem acesso
export const ADMIN_TABS: AdminTab[] = [
  { key: "BoDashboard", icon: "🏠", label: "Dashboard", perms: ["dashboard.view"] },
  { key: "BoUsers", icon: "👥", label: "Utilizadores", perms: ["users.view"] },
  { key: "BoMarket", icon: "🛒", label: "Mercado", perms: ["market.view"] },
  { key: "BoOrders", icon: "📦", label: "Encomendas", perms: ["orders.view"] },
  { key: "BoTransport", icon: "🚚", label: "Transportes", perms: ["transport.view"] },
  { key: "BoFinance", icon: "💰", label: "Financeiro", perms: ["finance.view"] },
  { key: "BoStats", icon: "📊", label: "Relatórios", perms: ["stats.view"] },
  { key: "BoSystem", icon: "⚙️", label: "Sistema", perms: [] },
];

// O alerta do painel aponta para uma tela; aqui diz-se qual
export const ATTENTION_ROUTES: Record<string, string> = {
  AdminReports: "BoReports",
  AdminOrders: "BoOrders",
  AdminIdentity: "BoIdentity",
  AdminTransporters: "BoTransportVerification",
  AdminAgents: "AdminAgents",
  AdminAgentCases: "AdminAgentCases",
  AdminAgentSecurity: "AdminAgentSecurity",
  AdminSecurity: "BoSecurity",
};

export const LEVEL_COLOR: Record<string, string> = {
  SUPER_ADMIN: "#6A1B9A",
  ADMIN: "#1565C0",
  USERS: "#00838F",
  MARKET: "#2E7D32",
  TRANSPORT: "#EF6C00",
  FINANCE: "#F9A825",
  SUPPORT: "#00ACC1",
  CONTENT: "#AD1457",
};

export const SEVERITY_BO_COLOR: Record<string, string> = {
  INFO: "#757575",
  ATENCAO: "#F9A825",
  ALERTA: "#EF6C00",
  EMERGENCIA: "#C62828",
};

export const SANCTION_COLOR: Record<string, string> = {
  SUSPENSAO: "#EF6C00",
  BLOQUEIO: "#C62828",
};

export const BO_ROLE_ICON: Record<string, string> = {
  AGRICULTOR: "🌾",
  PESCADOR: "🎣",
  ARTESAO: "🧺",
  COMERCIANTE: "🏪",
  TRANSPORTADOR: "🚚",
  ONG: "🌍",
  GOVERNO: "🏛️",
  AGENTE: "🤝",
  ADMIN: "🛡️",
  COMPRADOR: "🛒",
  CLIENTE: "🛒",
};

// Resumo curto de um aparelho a partir do texto que o telemóvel envia
export function deviceText(userAgent?: string | null): string {
  const ua = String(userAgent ?? "");
  if (!ua) return "Aparelho desconhecido";
  if (/okhttp|android/i.test(ua)) return "Telemóvel Android";
  if (/iphone|ios|cfnetwork/i.test(ua)) return "iPhone";
  if (/windows|macintosh|linux/i.test(ua)) return "Computador";
  return ua.slice(0, 40);
}
