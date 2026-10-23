import { Option } from "./ngoCatalog";

export const ORDER_STAGES: Option[] = [
  { value: "NOVA", label: "Nova" },
  { value: "CONFIRMADA", label: "Confirmada" },
  { value: "PREPARACAO", label: "Em preparação" },
  { value: "PRONTO", label: "Pronta" },
  { value: "TRANSPORTE", label: "Em transporte" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const OPEN_STAGES = ["NOVA", "CONFIRMADA", "PREPARACAO", "PRONTO", "TRANSPORTE", "ENTREGUE"];

// Junta os estados da encomenda em etapas simples, seja qual for o nome exato do estado
export function stageOf(status: any): string {
  const s = String(status ?? "").toUpperCase();
  if (s === "CONCLUIDO" || s === "CONCLUIDA") return "CONCLUIDA";
  if (s.includes("CANCEL") || s.includes("RECUS") || s.includes("REJEIT")) return "CANCELADA";
  if (s.includes("ENTREGUE")) return "ENTREGUE";
  if (s.includes("TRANSPORT") || s.includes("CAMINHO") || s.includes("ENTREGA")) return "TRANSPORTE";
  if (s.includes("PRONTO")) return "PRONTO";
  if (s.includes("PREPAR")) return "PREPARACAO";
  if (s.includes("CONFIRM") || s.includes("ACEIT")) return "CONFIRMADA";
  return "NOVA";
}

export function deliveryClosed(status: any): boolean {
  const s = String(status ?? "").toUpperCase();
  return s.includes("ENTREGUE") || s.includes("CONCLU") || s.includes("CANCEL") || s.includes("RECUS") || s.includes("FALH");
}

export const ORDER_ACTIONS: Option[] = [
  { value: "CONFIRMOU_COMPRADOR", label: "Confirmei as informações com o comprador" },
  { value: "CONFIRMOU_VENDEDOR", label: "Confirmei as informações com o vendedor" },
  { value: "CONTACTOU_COMPRADOR", label: "Contactei o comprador" },
  { value: "CONTACTOU_VENDEDOR", label: "Contactei o vendedor" },
  { value: "ACOMPANHOU_PREPARACAO", label: "Acompanhei a preparação" },
  { value: "ACOMPANHOU_TRANSPORTE", label: "Acompanhei o transporte" },
  { value: "ACOMPANHOU_ENTREGA", label: "Acompanhei a entrega" },
  { value: "NOTA", label: "Nota" },
];

export const CASE_CATEGORIES: Option[] = [
  { value: "ENCOMENDA", label: "Encomenda" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "PAGAMENTO", label: "Pagamento" },
  { value: "PRODUTO", label: "Produto" },
  { value: "CONTA", label: "Conta ou acesso" },
  { value: "OUTRO", label: "Outro problema" },
];

export const CASE_STATUS: Option[] = [
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_CURSO", label: "Em curso" },
  { value: "ESCALADO", label: "Com a equipa" },
  { value: "RESOLVIDO", label: "Resolvido" },
];

export const PRODUCT_SORTS: Option[] = [
  { value: "RECENTE", label: "Mais recentes" },
  { value: "PRECO_ASC", label: "Preço mais baixo" },
  { value: "PRECO_DESC", label: "Preço mais alto" },
];

export function agentOpsCatalog() {
  return {
    orderStages: ORDER_STAGES,
    orderActions: ORDER_ACTIONS,
    caseCategories: CASE_CATEGORIES,
    caseStatus: CASE_STATUS,
    productSorts: PRODUCT_SORTS,
  };
}
