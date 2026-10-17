export const PROJECT_STATUS_COLOR: Record<string, string> = {
  PLANEAMENTO: "#1565C0",
  EM_ANDAMENTO: "#2E7D32",
  SUSPENSO: "#F9A825",
  CONCLUIDO: "#00838F",
  CANCELADO: "#C62828",
};

export const PRIORITY_COLOR: Record<string, string> = {
  BAIXA: "#757575",
  MEDIA: "#1565C0",
  ALTA: "#EF6C00",
  URGENTE: "#C62828",
};

export const NEED_STATUS_COLOR: Record<string, string> = {
  IDENTIFICADA: "#F9A825",
  EM_APOIO: "#1565C0",
  ATENDIDA: "#2E7D32",
};

export const REQUEST_STATUS_COLOR: Record<string, string> = {
  NOVO: "#F9A825",
  EM_ANALISE: "#1565C0",
  ACEITE: "#2E7D32",
  RECUSADO: "#C62828",
  CONCLUIDO: "#00838F",
};

export const FUNDING_STATUS_COLOR: Record<string, string> = {
  PROSPECCAO: "#757575",
  SOLICITADO: "#F9A825",
  APROVADO: "#1565C0",
  RECEBIDO: "#2E7D32",
  RECUSADO: "#C62828",
  ENCERRADO: "#00838F",
};

export const PARTNER_STATUS_COLOR: Record<string, string> = {
  ATIVO: "#2E7D32",
  EM_NEGOCIACAO: "#F9A825",
  ENCERRADO: "#757575",
};

export const ENROLL_STATUS_COLOR: Record<string, string> = {
  INSCRITO: "#1565C0",
  PRESENTE: "#00838F",
  CONCLUIDO: "#2E7D32",
  FALTOU: "#C62828",
  CANCELADO: "#757575",
};

export const APPLICATION_STATUS_COLOR: Record<string, string> = {
  ENVIADA: "#F9A825",
  EM_ANALISE: "#1565C0",
  ACEITE: "#2E7D32",
  RECUSADA: "#C62828",
};

export const ALERT_COLOR: Record<string, string> = {
  ALTA: "#C62828",
  MEDIA: "#F9A825",
  INFO: "#1565C0",
};

export const VERIFICATION_STATUS: Record<string, { label: string; color: string }> = {
  NAO_ENVIADO: { label: "Não enviada", color: "#757575" },
  PENDENTE: { label: "Em análise", color: "#F9A825" },
  APROVADO: { label: "Verificada ✅", color: "#2E7D32" },
  RECUSADO: { label: "Recusada", color: "#C62828" },
};

export const AREA_INTRO: Record<string, string> = {
  AGRICULTURA:
    "Distribuição de sementes, equipamentos agrícolas, formação, irrigação, apoio à produção, segurança alimentar e desenvolvimento de cooperativas.",
  PESCA:
    "Apoio aos pescadores, equipamentos, segurança no mar, conservação do pescado, formação, pesca sustentável e apoio às comunidades pesqueiras.",
  ARTESANATO:
    "Formação, equipamentos, materiais, apoio a pequenos negócios, mulheres e jovens empreendedores e comercialização de produtos.",
};

export function colorOf(map: Record<string, string>, key?: string | null, fallback = "#757575"): string {
  return (key && map[key]) || fallback;
}
