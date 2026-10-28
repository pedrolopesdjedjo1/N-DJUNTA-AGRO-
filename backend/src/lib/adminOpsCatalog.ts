import { Option } from "./ngoCatalog";

export const DEPARTMENTS: { value: string; label: string; icon: string }[] = [
  { value: "AGRICULTURA", label: "Agricultura", icon: "🌾" },
  { value: "PESCA", label: "Pesca", icon: "🐟" },
  { value: "ARTESANATO", label: "Artesanato", icon: "🧺" },
  { value: "COMERCIO", label: "Comércio", icon: "🏪" },
  { value: "OUTRO", label: "Outros", icon: "📦" },
];
export const DEPARTMENT_VALUES = DEPARTMENTS.map((d) => d.value);

export const MARKET_STATUS: Option[] = [
  { value: "VISIVEL", label: "Visíveis" },
  { value: "ESCONDIDO", label: "Escondidos" },
  { value: "REVISAO", label: "Para rever" },
  { value: "REJEITADO", label: "Rejeitados" },
  { value: "REMOVIDO", label: "Removidos" },
  { value: "ATENCAO", label: "Com aviso de qualidade" },
  { value: "DENUNCIADO", label: "Denunciados" },
  { value: "DESTAQUE", label: "Em destaque" },
];

export const MARKET_SORTS: Option[] = [
  { value: "RECENTE", label: "Mais recentes" },
  { value: "ANTIGOS", label: "Mais antigos" },
  { value: "PRECO_ALTO", label: "Preço mais alto" },
  { value: "PRECO_BAIXO", label: "Preço mais baixo" },
];

export const MODERATION_REASONS: Option[] = [
  { value: "PROIBIDO", label: "Produto proibido" },
  { value: "ENGANOSO", label: "Descrição ou preço enganoso" },
  { value: "FRAUDE", label: "Suspeita de fraude" },
  { value: "FOTO", label: "Foto inadequada ou falsa" },
  { value: "DUPLICADO", label: "Anúncio repetido" },
  { value: "QUALIDADE", label: "Qualidade insuficiente" },
  { value: "OUTRO", label: "Outro motivo" },
];

export const QUALITY_FLAGS: Option[] = [
  { value: "SEM_FOTO", label: "Sem foto" },
  { value: "SEM_DESCRICAO", label: "Sem descrição" },
  { value: "SEM_PRECO", label: "Sem preço" },
  { value: "PRECO_ESTRANHO", label: "Preço muito diferente do normal" },
  { value: "TITULO_CURTO", label: "Título curto demais" },
  { value: "DUPLICADO", label: "Anúncio repetido" },
  { value: "SEM_STOCK", label: "Visível mas sem quantidade" },
];

export const ORDER_GROUPS: Option[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendentes" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "COMPLETED", label: "Concluídas" },
  { value: "CANCELLED", label: "Canceladas" },
  { value: "PROBLEMS", label: "Com problemas" },
];

// Que etapas da encomenda pertencem a cada grupo
export const STAGE_GROUPS: Record<string, string[]> = {
  PENDING: ["NOVA"],
  IN_PROGRESS: ["CONFIRMADA", "PREPARACAO", "PRONTO", "TRANSPORTE"],
  COMPLETED: ["CONCLUIDA", "ENTREGUE"],
  CANCELLED: ["CANCELADA"],
};

export const ORDER_PROBLEMS: Option[] = [
  { value: "STUCK", label: "Parada há dias" },
  { value: "DISPUTE", label: "Em disputa" },
  { value: "REPORTED", label: "Denunciada" },
  { value: "DELIVERY_PROBLEM", label: "Problema de entrega" },
  { value: "AGENT_CASE", label: "Chamado de agente" },
  { value: "PAYMENT_LATE", label: "Pagamento por confirmar há dias" },
];

export const DISPUTE_REASONS: Option[] = [
  { value: "NAO_RECEBIDO", label: "Não recebi a encomenda" },
  { value: "DIFERENTE", label: "Produto diferente do anunciado" },
  { value: "DANIFICADO", label: "Produto danificado" },
  { value: "ATRASO", label: "Atraso na entrega" },
  { value: "PAGAMENTO", label: "Problema com o pagamento" },
  { value: "OUTRO", label: "Outro problema" },
];

export const DISPUTE_STATUS: Option[] = [
  { value: "ABERTA", label: "Aberta" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "RESOLVIDA", label: "Resolvida" },
];

export const DISPUTE_DECISIONS: Option[] = [
  { value: "FAVOR_COMPRADOR", label: "A favor do comprador" },
  { value: "FAVOR_VENDEDOR", label: "A favor do vendedor" },
  { value: "ACORDO", label: "Acordo entre as partes" },
  { value: "SEM_ACAO", label: "Sem ação" },
];

export const TRANSPORTER_SORTS: Option[] = [
  { value: "ENTREGAS", label: "Mais entregas" },
  { value: "AVALIACAO", label: "Melhor avaliação" },
  { value: "PROBLEMAS", label: "Mais problemas" },
  { value: "RECENTE", label: "Mais recentes" },
];

// Ações novas deste módulo (juntam-se às da lista da parte 1)
export const AUDIT_ACTIONS_EXTRA: Option[] = [
  { value: "CATEGORY_EDIT", label: "Editou uma categoria do mercado" },
  { value: "PRODUCT_QUALITY", label: "Avisou sobre a qualidade de um produto" },
  { value: "PRODUCT_BULK_APPROVE", label: "Aprovou vários produtos" },
  { value: "ORDER_NOTIFY", label: "Avisou os participantes de uma encomenda" },
  { value: "DISPUTE_ASSIGN", label: "Assumiu uma disputa" },
  { value: "DISPUTE_MESSAGE", label: "Escreveu numa disputa" },
  { value: "DELIVERY_WARN", label: "Avisou um transportador" },
];

export function adminOpsCatalog() {
  return {
    departments: DEPARTMENTS,
    marketStatus: MARKET_STATUS,
    marketSorts: MARKET_SORTS,
    moderationReasons: MODERATION_REASONS,
    qualityFlags: QUALITY_FLAGS,
    orderGroups: ORDER_GROUPS,
    orderProblems: ORDER_PROBLEMS,
    disputeReasons: DISPUTE_REASONS,
    disputeStatus: DISPUTE_STATUS,
    disputeDecisions: DISPUTE_DECISIONS,
    transporterSorts: TRANSPORTER_SORTS,
    auditActionsExtra: AUDIT_ACTIONS_EXTRA,
  };
}
