import { Option } from "./ngoCatalog";

export const BROADCAST_KINDS: Option[] = [
  { value: "GERAL", label: "Aviso geral" },
  { value: "REGIAO", label: "Aviso por região" },
  { value: "PERFIL", label: "Aviso por perfil" },
  { value: "CLIMA", label: "Alerta meteorológico" },
  { value: "MARITIMO", label: "Alerta marítimo" },
  { value: "AGRICOLA", label: "Alerta agrícola" },
  { value: "ESTRADA", label: "Alerta de estrada" },
  { value: "EMERGENCIA", label: "Alerta de emergência" },
];

export const ALERT_KINDS = ["CLIMA", "MARITIMO", "AGRICOLA", "ESTRADA", "EMERGENCIA"];

export const SEVERITIES: Option[] = [
  { value: "INFO", label: "Informação" },
  { value: "ATENCAO", label: "Atenção" },
  { value: "ALERTA", label: "Alerta" },
  { value: "EMERGENCIA", label: "Emergência" },
];

export const AUDIENCES: Option[] = [
  { value: "TODOS", label: "Todos" },
  { value: "AGRICULTOR", label: "Agricultores" },
  { value: "PESCADOR", label: "Pescadores" },
  { value: "ARTESAO", label: "Artesãos" },
  { value: "COMERCIANTE", label: "Comerciantes" },
  { value: "TRANSPORTADOR", label: "Transportadores" },
  { value: "CLIENTE", label: "Clientes" },
  { value: "ONG", label: "ONGs" },
  { value: "GOVERNO", label: "Instituições públicas" },
  { value: "AGENTE", label: "Agentes" },
];

// Para quem costuma servir cada tipo de alerta (a equipa pode mudar)
export const SUGGESTED_AUDIENCE: Record<string, string[]> = {
  GERAL: [],
  REGIAO: [],
  PERFIL: [],
  CLIMA: [],
  MARITIMO: ["PESCADOR", "TRANSPORTADOR"],
  AGRICOLA: ["AGRICULTOR"],
  ESTRADA: ["TRANSPORTADOR", "COMERCIANTE", "AGRICULTOR"],
  EMERGENCIA: [],
};

export const HIDE_KINDS: Option[] = [
  { value: "PUBLICATION", label: "Publicação" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "PROJECT", label: "Projeto" },
  { value: "LEARNING", label: "Curso, guia ou vídeo" },
  { value: "EVENT", label: "Evento" },
  { value: "POST", label: "Publicação da comunidade" },
];

export const HIGHLIGHT_KINDS: Option[] = [
  { value: "PUBLICACAO", label: "Publicação" },
  { value: "CURSO", label: "Curso, guia ou vídeo" },
  { value: "EVENTO", label: "Evento" },
];

export const BANNER_LINKS: Option[] = [
  { value: "NONE", label: "Sem ligação" },
  { value: "SCREEN", label: "Abrir uma tela do app" },
  { value: "URL", label: "Abrir um endereço da internet" },
];

export const EVENT_GROUPS: Option[] = [
  { value: "FEIRA", label: "Feiras" },
  { value: "FORMACAO", label: "Formação" },
  { value: "CAMPANHA", label: "Campanhas" },
  { value: "OUTRO", label: "Outros" },
];

export const TICKET_STATUS: Option[] = [
  { value: "ABERTO", label: "Por responder" },
  { value: "EM_CURSO", label: "Em curso" },
  { value: "RESOLVIDO", label: "Resolvido" },
];

export const TICKET_CATEGORIES: Option[] = [
  { value: "PAGAMENTO", label: "Problemas de pagamento" },
  { value: "ENCOMENDA", label: "Problemas de encomendas" },
  { value: "TECNICO", label: "Problemas técnicos" },
  { value: "RECLAMACAO", label: "Reclamações" },
  { value: "EMERGENCIA", label: "Emergências" },
  { value: "OUTRO", label: "Outros" },
];

export const STAT_SEGMENTS: { value: string; label: string; icon: string; roles: string[] }[] = [
  { value: "AGRICULTORES", label: "Agricultores", icon: "🌾", roles: ["AGRICULTOR"] },
  { value: "PESCADORES", label: "Pescadores", icon: "🎣", roles: ["PESCADOR"] },
  { value: "ARTESAOS", label: "Artesãos", icon: "🧺", roles: ["ARTESAO"] },
  { value: "COMERCIANTES", label: "Comerciantes", icon: "🏪", roles: ["COMERCIANTE"] },
  { value: "TRANSPORTADORES", label: "Transportadores", icon: "🚚", roles: ["TRANSPORTADOR"] },
  { value: "ONGS", label: "ONGs", icon: "🌍", roles: ["ONG"] },
  { value: "INSTITUICOES", label: "Instituições públicas", icon: "🏛️", roles: ["GOVERNO"] },
];

export const AUDIT_ACTIONS_CONTENT: Option[] = [
  { value: "EVENT_CANCEL", label: "Cancelou um evento" },
  { value: "EVENT_RESTORE", label: "Repôs um evento" },
  { value: "EVENT_NOTIFY", label: "Avisou os participantes de um evento" },
  { value: "SUPPORT_STATUS", label: "Mudou o estado de um ticket" },
  { value: "SUPPORT_ASSIGN", label: "Assumiu um ticket" },
];

export function adminContentCatalog() {
  return {
    broadcastKinds: BROADCAST_KINDS,
    alertKinds: ALERT_KINDS,
    severities: SEVERITIES,
    audiences: AUDIENCES,
    suggestedAudience: SUGGESTED_AUDIENCE,
    hideKinds: HIDE_KINDS,
    highlightKinds: HIGHLIGHT_KINDS,
    bannerLinks: BANNER_LINKS,
    eventGroups: EVENT_GROUPS,
    ticketStatus: TICKET_STATUS,
    ticketCategories: TICKET_CATEGORIES,
    statSegments: STAT_SEGMENTS.map((s) => ({ value: s.value, label: s.label, icon: s.icon })),
    auditActionsContent: AUDIT_ACTIONS_CONTENT,
  };
}
