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
  };
}
