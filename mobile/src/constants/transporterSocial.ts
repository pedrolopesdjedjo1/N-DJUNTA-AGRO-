export const REPORT_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: "FRAUDE", label: "Fraude ou engano", icon: "🚫" },
  { value: "CONTA_SUSPEITA", label: "Conta ou atividade suspeita", icon: "🕵️" },
  { value: "ABUSO", label: "Abuso ou mau comportamento", icon: "😡" },
  { value: "CONTEUDO_INADEQUADO", label: "Conteúdo inadequado", icon: "⚠️" },
  { value: "PRODUTO_PROIBIDO", label: "Produto proibido", icon: "⛔" },
  { value: "RECLAMACAO", label: "Reclamação sobre um serviço", icon: "📣" },
  { value: "OUTRO", label: "Outro problema", icon: "📝" },
];

export const REPORT_TARGET_TEXT: Record<string, string> = {
  USER: "uma pessoa",
  PRODUCT: "um produto",
  ORDER: "uma encomenda",
  DELIVERY: "uma entrega",
  PUBLICATION: "uma publicação",
  REVIEW: "uma avaliação",
  OTHER: "outra situação",
};

export const REPORT_STATUS_TEXT: Record<string, { label: string; color: string }> = {
  ABERTA: { label: "Recebida", color: "#F9A825" },
  EM_ANALISE: { label: "Em análise", color: "#1565C0" },
  RESOLVIDA: { label: "Analisada", color: "#2E7D32" },
  ARQUIVADA: { label: "Arquivada", color: "#757575" },
};

export const REQUEST_STATUS_COLOR: Record<string, string> = {
  PENDENTE: "#F9A825",
  ACEITE: "#2E7D32",
  RECUSADA: "#757575",
};

export const VIA_ICON: Record<string, string> = {
  CHAMADA: "📞",
  WHATSAPP: "💬",
  MENSAGEM: "✉️",
};

export const DIRECTORY_ROLE_ICON: Record<string, string> = {
  AGRICULTOR: "🌾",
  PESCADOR: "🎣",
  ARTESAO: "🧺",
  COMERCIANTE: "🏪",
  AGENTE: "🤝",
};

export const RELATION_TEXT: Record<string, string> = {
  BUYER: "Comprador",
  SELLER: "Vendedor",
};

// O que falta para o nível seguinte da classificação do transportador
export function nextBadgeStep(delivered: number, average: number | null, badge: string): string {
  if (badge === "EXCELENTE") return "Chegou ao nível mais alto. Continue assim!";

  const missing: string[] = [];
  if (badge === "CONFIAVEL") {
    if (delivered < 30) missing.push(`mais ${30 - delivered} entrega(s) (30 no total)`);
    if (average === null || average < 4.5) missing.push("média de 4,5 estrelas ou mais");
    return `Para ser Excelente: ${missing.join(" e ")}.`;
  }

  if (delivered < 10) missing.push(`mais ${10 - delivered} entrega(s) (10 no total)`);
  if (average === null || average < 4) missing.push("média de 4 estrelas ou mais");
  return `Para ser de Confiança: ${missing.join(" e ")}.`;
}
