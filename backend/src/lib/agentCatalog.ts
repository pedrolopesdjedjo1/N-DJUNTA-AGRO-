import { Option } from "./ngoCatalog";

export const AGENT_TYPES: Option[] = [
  { value: "COMUNITARIO", label: "Agente comunitário" },
  { value: "COMERCIAL", label: "Agente comercial" },
  { value: "COOPERATIVA", label: "Agente de cooperativa" },
  { value: "PARCEIRO", label: "Agente de organização ou instituição" },
];

export const AGENT_AREAS: Option[] = [
  { value: "AGRICULTURA", label: "Agricultura" },
  { value: "PESCA", label: "Pesca" },
  { value: "ARTESANATO", label: "Artesanato" },
  { value: "COMERCIO", label: "Comércio" },
  { value: "TRANSPORTE", label: "Transporte" },
];

export const AGENT_DOCUMENT_KINDS: Option[] = [
  { value: "IDENTIFICACAO", label: "Bilhete de identidade ou passaporte" },
  { value: "COMPROVATIVO_MORADA", label: "Comprovativo de morada" },
  { value: "CARTA_APRESENTACAO", label: "Carta de apresentação (cooperativa, ONG ou instituição)" },
  { value: "OUTRO", label: "Outro documento" },
];

export const AGENT_STATUS: Option[] = [
  { value: "RASCUNHO", label: "Por enviar" },
  { value: "PENDENTE", label: "Em análise" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "RECUSADO", label: "Recusado" },
  { value: "SUSPENSO", label: "Suspenso" },
];

// Tipos de conta que um agente pode registar e ajudar
export const CLIENT_KINDS: Option[] = [
  { value: "COMPRADOR", label: "Cliente (comprador)" },
  { value: "AGRICULTOR", label: "Agricultor" },
  { value: "PESCADOR", label: "Pescador" },
  { value: "ARTESAO", label: "Artesão" },
  { value: "COMERCIANTE", label: "Comerciante" },
  { value: "TRANSPORTADOR", label: "Transportador" },
];

// Para validar contas por texto (sem filtrar o enum na base de dados)
export const CLIENT_ROLES = ["COMPRADOR", "CLIENTE", "AGRICULTOR", "PESCADOR", "ARTESAO", "COMERCIANTE", "TRANSPORTADOR"];

export const LINK_STATUS: Option[] = [
  { value: "PENDENTE_ACEITACAO", label: "Convite enviado" },
  { value: "ATIVO", label: "Ativo" },
  { value: "REVOGADO", label: "Acesso retirado" },
  { value: "RECUSADO", label: "Convite recusado" },
];

export const ACTIVITY_KINDS: Option[] = [
  { value: "CADASTRO", label: "Registo de conta" },
  { value: "CONVITE", label: "Convite" },
  { value: "CONTACTO", label: "Contacto" },
  { value: "VISITA", label: "Visita" },
  { value: "ATENDIMENTO", label: "Atendimento" },
  { value: "NOTA", label: "Nota" },
  { value: "ASSISTENCIA_INICIADA", label: "Sessão de ajuda iniciada" },
  { value: "ASSISTENCIA_TERMINADA", label: "Sessão de ajuda terminada" },
  { value: "ACAO_ASSISTIDA", label: "Ação feita na conta" },
  { value: "ENCOMENDA", label: "Encomenda" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "OPORTUNIDADE", label: "Oportunidade" },
  { value: "PROBLEMA", label: "Problema" },
  { value: "TAREFA", label: "Tarefa" },
];

// Tipos que o agente pode escrever à mão no histórico
export const MANUAL_ACTIVITY_KINDS = ["NOTA", "CONTACTO", "VISITA", "ATENDIMENTO"];

export const ASSIST_REASONS: Option[] = [
  { value: "PUBLICAR_PRODUTO", label: "Publicar produtos" },
  { value: "COMPRAR", label: "Ajudar a comprar" },
  { value: "ATUALIZAR_DADOS", label: "Atualizar dados" },
  { value: "TRANSPORTE", label: "Pedir transporte" },
  { value: "ENCOMENDAS", label: "Tratar de encomendas" },
  { value: "OUTRO", label: "Outro" },
];

// Estados de encomenda que já não precisam de acompanhamento
export const ORDER_CLOSED = ["CONCLUIDO", "CANCELADO", "RECUSADO"];

export const TASK_KINDS: Option[] = [
  { value: "GERAL", label: "Geral" },
  { value: "CONTACTAR", label: "Contactar" },
  { value: "VISITAR", label: "Visitar" },
  { value: "ENCOMENDA", label: "Acompanhar encomenda" },
  { value: "DADOS", label: "Atualizar dados" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "OPORTUNIDADE", label: "Oportunidade" },
  { value: "PROBLEMA", label: "Resolver problema" },
];

export const TASK_PRIORITY: Option[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
];

export const NEED_CATEGORIES: Option[] = [
  { value: "SEMENTES", label: "Sementes e plantas" },
  { value: "EQUIPAMENTO", label: "Equipamento e ferramentas" },
  { value: "FORMACAO", label: "Formação" },
  { value: "FINANCIAMENTO", label: "Financiamento" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "ARMAZENAMENTO", label: "Armazenamento e conservação" },
  { value: "AGUA", label: "Água e irrigação" },
  { value: "MERCADO", label: "Acesso a mercado" },
  { value: "INFRAESTRUTURA", label: "Estradas, pontes e infraestruturas" },
  { value: "SEGURANCA", label: "Segurança (mar ou terra)" },
  { value: "OUTRO", label: "Outra necessidade" },
];

export const NEED_PRIORITY: Option[] = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Média" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
];

export const NEED_STATUS: Option[] = [
  { value: "IDENTIFICADA", label: "Identificada" },
  { value: "ENCAMINHADA", label: "Encaminhada" },
  { value: "ATENDIDA", label: "Atendida" },
];

export const PRODUCER_KINDS: Option[] = [
  { value: "AGRICULTOR", label: "Agricultores" },
  { value: "PESCADOR", label: "Pescadores" },
  { value: "ARTESAO", label: "Artesãos" },
  { value: "COMERCIANTE", label: "Pequenos comerciantes" },
  { value: "COOPERATIVA", label: "Cooperativas" },
];

export const REFERRAL_TYPES: Option[] = [
  { value: "OPORTUNIDADE", label: "Oportunidade" },
  { value: "FORMACAO", label: "Formação" },
  { value: "PROGRAMA", label: "Programa público" },
];

export function agentCatalog() {
  return {
    agentTypes: AGENT_TYPES,
    agentAreas: AGENT_AREAS,
    documentKinds: AGENT_DOCUMENT_KINDS,
    agentStatus: AGENT_STATUS,
    clientKinds: CLIENT_KINDS,
    linkStatus: LINK_STATUS,
    activityKinds: ACTIVITY_KINDS,
    manualActivityKinds: ACTIVITY_KINDS.filter((k) => MANUAL_ACTIVITY_KINDS.includes(k.value)),
    assistReasons: ASSIST_REASONS,
    taskKinds: TASK_KINDS,
    taskPriority: TASK_PRIORITY,
    needCategories: NEED_CATEGORIES,
    needPriority: NEED_PRIORITY,
    needStatus: NEED_STATUS,
    producerKinds: PRODUCER_KINDS,
    referralTypes: REFERRAL_TYPES,
  };
}
