import { humanize } from "./agentOps";

export const COOP_STATUS_COLOR: Record<string, string> = {
  SEM_ANALISE: "#F9A825",
  APROVADA: "#2E7D32",
  SUSPENSA: "#C62828",
  RECUSADA: "#757575",
};

export const ORG_STATUS_COLOR: Record<string, string> = {
  APROVADO: "#2E7D32",
  APROVADA: "#2E7D32",
  VERIFICADO: "#2E7D32",
  PENDENTE: "#F9A825",
  EM_ANALISE: "#F9A825",
  RECUSADO: "#757575",
  RECUSADA: "#757575",
  SUSPENSO: "#C62828",
  SEM_PERFIL: "#757575",
  RASCUNHO: "#757575",
};

const ORG_STATUS_LABEL: Record<string, string> = {
  APROVADO: "Verificada",
  APROVADA: "Verificada",
  VERIFICADO: "Verificada",
  PENDENTE: "Em análise",
  EM_ANALISE: "Em análise",
  RECUSADO: "Recusada",
  RECUSADA: "Recusada",
  SUSPENSO: "Suspensa",
  SEM_PERFIL: "Sem perfil",
  RASCUNHO: "Por enviar",
};

export function orgStatusLabel(status: string): string {
  return ORG_STATUS_LABEL[status] ?? humanize(status);
}

export const CONTENT_KIND_ICON: Record<string, string> = {
  PUBLICATION: "📰",
  OPPORTUNITY: "🎯",
  PROJECT: "📋",
  LEARNING: "📚",
  EVENT: "🎪",
  POST: "💬",
};

export const CONTENT_KIND_TITLE: Record<string, string> = {
  PUBLICATION: "Publicações e notícias",
  OPPORTUNITY: "Oportunidades",
  PROJECT: "Projetos",
  LEARNING: "Cursos, guias e vídeos",
  EVENT: "Eventos",
  POST: "Publicações da comunidade",
};

// Os tipos de conteúdo que se podem pôr em destaque
export const HIGHLIGHT_OF: Record<string, string> = { PUBLICATION: "PUBLICACAO", LEARNING: "CURSO", EVENT: "EVENTO" };

export const EVENT_GROUP_ICON: Record<string, string> = {
  FEIRA: "🛒",
  FORMACAO: "🎓",
  CAMPANHA: "📣",
  OUTRO: "📌",
};

export const BANNER_STATE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Ativo", color: "#2E7D32" },
  SCHEDULED: { label: "Agendado", color: "#1565C0" },
  ENDED: { label: "Terminado", color: "#757575" },
  OFF: { label: "Desligado", color: "#757575" },
};

export const GOV_LISTS: Record<string, { title: string; hint: string }> = {
  programs: { title: "🏛️ Programas", hint: "Programas públicos criados pelas instituições do governo." },
  services: { title: "🏢 Serviços públicos", hint: "Serviços que as instituições publicam para as pessoas. Pode esconder um serviço com erros." },
  publications: { title: "📢 Publicações e comunicados", hint: "O que as instituições do governo publicam. Pode esconder o que for inadequado." },
  requests: { title: "📨 Pedidos das comunidades", hint: "Denúncias e pedidos de apoio enviados às instituições. Quem pediu nunca aparece, para proteger quem denuncia." },
};

export const CONTENT_HUB: { icon: string; label: string; route: string; params?: Record<string, any>; perms: string[] }[] = [
  { icon: "📰", label: "Publicações e notícias", route: "BoContentList", params: { kind: "PUBLICATION" }, perms: ["content.manage", "orgs.manage"] },
  { icon: "📚", label: "Cursos, guias e vídeos", route: "BoContentList", params: { kind: "LEARNING" }, perms: ["content.manage"] },
  { icon: "🎪", label: "Eventos", route: "BoEvents", perms: ["events.manage", "content.manage"] },
  { icon: "🎯", label: "Oportunidades", route: "BoContentList", params: { kind: "OPPORTUNITY" }, perms: ["content.manage", "orgs.manage"] },
  { icon: "📋", label: "Projetos", route: "BoContentList", params: { kind: "PROJECT" }, perms: ["content.manage", "orgs.manage"] },
  { icon: "💬", label: "Publicações da comunidade", route: "BoContentList", params: { kind: "POST" }, perms: ["content.manage"] },
  { icon: "🖼️", label: "Banners", route: "BoBanners", perms: ["content.manage"] },
  { icon: "⭐", label: "Destaques", route: "BoHighlights", perms: ["content.manage", "events.manage"] },
];
