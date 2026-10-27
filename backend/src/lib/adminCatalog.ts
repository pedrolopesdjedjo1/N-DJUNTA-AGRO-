import { Option } from "./ngoCatalog";

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "dashboard.view", label: "Ver o painel principal", group: "Painel" },
  { key: "users.view", label: "Ver e pesquisar utilizadores", group: "Utilizadores" },
  { key: "users.manage", label: "Editar, suspender e bloquear contas", group: "Utilizadores" },
  { key: "users.verify", label: "Verificar identidades", group: "Utilizadores" },
  { key: "profiles.view", label: "Ver os perfis por tipo", group: "Utilizadores" },
  { key: "market.view", label: "Ver produtos e vendedores", group: "Mercado" },
  { key: "market.moderate", label: "Aprovar, rejeitar e remover produtos", group: "Mercado" },
  { key: "orders.view", label: "Ver encomendas", group: "Encomendas" },
  { key: "orders.manage", label: "Tratar problemas e disputas", group: "Encomendas" },
  { key: "transport.view", label: "Ver transportadores e entregas", group: "Transportes" },
  { key: "transport.manage", label: "Tratar problemas de entrega e verificar transportadores", group: "Transportes" },
  { key: "finance.view", label: "Ver vendas, pagamentos e relatórios financeiros", group: "Financeiro" },
  { key: "finance.manage", label: "Decidir reembolsos e pagar comissões", group: "Financeiro" },
  { key: "coops.manage", label: "Aprovar e gerir cooperativas", group: "Organizações" },
  { key: "orgs.manage", label: "Verificar e gerir ONGs e instituições", group: "Organizações" },
  { key: "gov.view", label: "Acompanhar o governo e os serviços públicos", group: "Organizações" },
  { key: "content.manage", label: "Gerir publicações, cursos, banners e destaques", group: "Conteúdo" },
  { key: "events.manage", label: "Gerir eventos", group: "Conteúdo" },
  { key: "reports.view", label: "Ver denúncias", group: "Moderação" },
  { key: "reports.moderate", label: "Decidir sobre denúncias", group: "Moderação" },
  { key: "notify.send", label: "Enviar avisos às pessoas", group: "Comunicação" },
  { key: "alerts.manage", label: "Criar e terminar alertas", group: "Comunicação" },
  { key: "stats.view", label: "Ver relatórios e estatísticas", group: "Relatórios" },
  { key: "support.view", label: "Ver a caixa de entrada e os tickets", group: "Suporte" },
  { key: "support.reply", label: "Responder aos utilizadores", group: "Suporte" },
  { key: "security.view", label: "Ver o registo de atividades e os alertas de segurança", group: "Segurança" },
  { key: "security.manage", label: "Gerir sessões, desbloquear e repor a autenticação dos outros", group: "Segurança" },
  { key: "team.manage", label: "Gerir a equipa de administradores", group: "Equipa" },
  { key: "settings.manage", label: "Mudar as configurações do sistema", group: "Sistema" },
];

const ALL = PERMISSIONS.map((p) => p.key);

// Estas duas só existem no nível Super administrador: não se podem dar como extra
export const RESERVED_PERMISSIONS = ["team.manage", "security.manage"];

export const LEVEL_INFO: { value: string; label: string; icon: string; description: string }[] = [
  { value: "SUPER_ADMIN", label: "Super administrador", icon: "👑", description: "Controlo total do sistema." },
  { value: "ADMIN", label: "Administrador", icon: "🛡️", description: "Gestão geral da plataforma." },
  { value: "USERS", label: "Admin de utilizadores", icon: "👥", description: "Contas, perfis e verificações." },
  { value: "MARKET", label: "Admin do mercado", icon: "🛒", description: "Produtos, vendedores e encomendas." },
  { value: "TRANSPORT", label: "Admin de transportes", icon: "🚚", description: "Transportadores e entregas." },
  { value: "FINANCE", label: "Admin financeiro", icon: "💰", description: "Pagamentos e transações." },
  { value: "SUPPORT", label: "Admin de suporte", icon: "🎧", description: "Atendimento e reclamações." },
  { value: "CONTENT", label: "Admin de conteúdo", icon: "📢", description: "Notícias, eventos, cursos e publicações." },
];

export const ADMIN_LEVELS: Option[] = LEVEL_INFO.map((l) => ({ value: l.value, label: l.label }));

export const LEVEL_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((k) => !RESERVED_PERMISSIONS.includes(k)),
  USERS: [
    "dashboard.view",
    "users.view",
    "users.manage",
    "users.verify",
    "profiles.view",
    "coops.manage",
    "orgs.manage",
    "gov.view",
    "reports.view",
    "reports.moderate",
    "stats.view",
  ],
  MARKET: [
    "dashboard.view",
    "users.view",
    "profiles.view",
    "market.view",
    "market.moderate",
    "orders.view",
    "orders.manage",
    "reports.view",
    "reports.moderate",
    "stats.view",
  ],
  TRANSPORT: [
    "dashboard.view",
    "users.view",
    "profiles.view",
    "transport.view",
    "transport.manage",
    "orders.view",
    "alerts.manage",
    "reports.view",
    "reports.moderate",
    "stats.view",
  ],
  FINANCE: ["dashboard.view", "users.view", "orders.view", "finance.view", "finance.manage", "stats.view"],
  SUPPORT: ["dashboard.view", "users.view", "orders.view", "reports.view", "reports.moderate", "support.view", "support.reply"],
  CONTENT: ["dashboard.view", "gov.view", "content.manage", "events.manage", "notify.send", "alerts.manage", "reports.view", "stats.view"],
};

// Permissões finais de um administrador: as do nível, mais as extra, menos as retiradas
export function permissionsFor(level: string, extra: string[] = [], denied: string[] = []): Set<string> {
  const set = new Set<string>(LEVEL_PERMISSIONS[level] ?? []);

  extra.forEach((k) => {
    if (ALL.includes(k) && (!RESERVED_PERMISSIONS.includes(k) || level === "SUPER_ADMIN")) set.add(k);
  });
  denied.forEach((k) => {
    if (k !== "dashboard.view") set.delete(k);
  });

  return set;
}

export const AUDIT_ACTIONS: Option[] = [
  { value: "TEAM_PROMOTE", label: "Criou um administrador" },
  { value: "TEAM_UPDATE", label: "Mudou funções ou permissões" },
  { value: "TEAM_SUSPEND", label: "Suspendeu um administrador" },
  { value: "TEAM_REACTIVATE", label: "Reativou um administrador" },
  { value: "TEAM_DEMOTE", label: "Retirou o acesso de administrador" },
  { value: "SECURITY_2FA_ENABLE", label: "Ativou a autenticação de dois fatores" },
  { value: "SECURITY_2FA_DISABLE", label: "Desativou a autenticação de dois fatores" },
  { value: "SECURITY_2FA_RESET", label: "Repôs a autenticação de dois fatores de alguém" },
  { value: "SECURITY_UNLOCK", label: "Desbloqueou um acesso" },
  { value: "SECURITY_SESSION_REVOKE", label: "Terminou sessões" },
  { value: "SETTING_UPDATE", label: "Mudou uma configuração" },
  { value: "USER_EDIT", label: "Editou um utilizador" },
  { value: "USER_SUSPEND", label: "Suspendeu uma conta" },
  { value: "USER_BLOCK", label: "Bloqueou uma conta" },
  { value: "USER_REACTIVATE", label: "Reativou uma conta" },
  { value: "USER_VERIFY", label: "Verificou uma identidade" },
  { value: "USER_UNVERIFY", label: "Retirou a verificação" },
  { value: "USER_ROLE", label: "Mudou o perfil de uma conta" },
  { value: "PRODUCT_APPROVE", label: "Aprovou um produto" },
  { value: "PRODUCT_REJECT", label: "Rejeitou um produto" },
  { value: "PRODUCT_REMOVE", label: "Removeu um produto" },
  { value: "PRODUCT_RESTORE", label: "Repôs um produto" },
  { value: "PRODUCT_FEATURE", label: "Pôs um produto em destaque" },
  { value: "ORDER_NOTE", label: "Registou uma nota numa encomenda" },
  { value: "DISPUTE_RESOLVE", label: "Decidiu uma disputa" },
  { value: "DELIVERY_NOTE", label: "Tratou um problema de entrega" },
  { value: "TRANSPORTER_REVIEW", label: "Decidiu a verificação de um transportador" },
  { value: "REFUND_DECIDE", label: "Decidiu um reembolso" },
  { value: "COMMISSION_PAY", label: "Registou o pagamento de comissões" },
  { value: "COOP_APPROVE", label: "Aprovou uma cooperativa" },
  { value: "COOP_SUSPEND", label: "Suspendeu uma cooperativa" },
  { value: "COOP_EDIT", label: "Editou uma cooperativa" },
  { value: "ORG_REVIEW", label: "Decidiu a verificação de uma organização" },
  { value: "ORG_SUSPEND", label: "Suspendeu uma organização" },
  { value: "PUBLICATION_HIDE", label: "Escondeu uma publicação" },
  { value: "PUBLICATION_RESTORE", label: "Repôs uma publicação" },
  { value: "OPPORTUNITY_CLOSE", label: "Fechou uma oportunidade" },
  { value: "REPORT_ASSIGN", label: "Assumiu uma denúncia" },
  { value: "REPORT_DECIDE", label: "Decidiu uma denúncia" },
  { value: "BROADCAST_SEND", label: "Enviou um aviso" },
  { value: "ALERT_CREATE", label: "Criou um alerta" },
  { value: "ALERT_END", label: "Terminou um alerta" },
  { value: "BANNER_SAVE", label: "Guardou um banner" },
  { value: "BANNER_DELETE", label: "Apagou um banner" },
  { value: "HIGHLIGHT_SAVE", label: "Guardou um destaque" },
  { value: "SUPPORT_REPLY", label: "Respondeu a um utilizador" },
];

export const SECURITY_EVENT_KINDS: Option[] = [
  { value: "LOGIN_OK", label: "Acesso confirmado" },
  { value: "LOGIN_FAIL", label: "Código errado" },
  { value: "LOCKED", label: "Acesso bloqueado por segurança" },
  { value: "NEW_DEVICE", label: "Novo dispositivo" },
  { value: "TWO_FACTOR_ON", label: "Autenticação de dois fatores ativada" },
  { value: "TWO_FACTOR_OFF", label: "Autenticação de dois fatores desativada" },
  { value: "TWO_FACTOR_RESET", label: "Autenticação de dois fatores reposta" },
  { value: "SESSION_ENDED", label: "Sessão terminada" },
  { value: "SESSION_REVOKED", label: "Sessão revogada" },
  { value: "UNLOCKED", label: "Acesso desbloqueado" },
  { value: "ADMIN_SUSPENDED", label: "Administrador suspenso" },
  { value: "ADMIN_REACTIVATED", label: "Administrador reativado" },
];

export const ADMIN_STATUS: Option[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "SUSPENSO", label: "Suspenso" },
];

export function adminCatalog() {
  return {
    levels: LEVEL_INFO,
    permissions: PERMISSIONS,
    levelPermissions: LEVEL_PERMISSIONS,
    reservedPermissions: RESERVED_PERMISSIONS,
    auditActions: AUDIT_ACTIONS,
    securityEventKinds: SECURITY_EVENT_KINDS,
    adminStatus: ADMIN_STATUS,
  };
}
