export interface Option {
  value: string;
  label: string;
}

export const AREAS: (Option & { icon: string })[] = [
  { value: "AGRICULTURA", label: "Agricultura", icon: "🌾" },
  { value: "PESCA", label: "Pesca", icon: "🎣" },
  { value: "ARTESANATO", label: "Artesanato e empreendedorismo", icon: "🧺" },
  { value: "ALIMENTACAO", label: "Alimentação e nutrição", icon: "🍲" },
  { value: "JUVENTUDE", label: "Juventude", icon: "🧑‍🎓" },
  { value: "AMBIENTE", label: "Ambiente", icon: "🌳" },
  { value: "COMUNITARIO", label: "Desenvolvimento comunitário", icon: "🏘️" },
  { value: "OUTRO", label: "Outra área", icon: "📌" },
];

export const FOCUS: Record<string, Option[]> = {
  AGRICULTURA: [
    { value: "SEMENTES", label: "Distribuição de sementes" },
    { value: "EQUIPAMENTOS", label: "Equipamentos agrícolas" },
    { value: "FORMACAO", label: "Formação" },
    { value: "IRRIGACAO", label: "Irrigação" },
    { value: "PRODUCAO", label: "Apoio à produção" },
    { value: "SEGURANCA_ALIMENTAR", label: "Segurança alimentar" },
    { value: "COOPERATIVAS", label: "Desenvolvimento de cooperativas" },
  ],
  PESCA: [
    { value: "APOIO_PESCADORES", label: "Apoio aos pescadores" },
    { value: "EQUIPAMENTOS", label: "Equipamentos" },
    { value: "SEGURANCA_MAR", label: "Segurança no mar" },
    { value: "CONSERVACAO", label: "Conservação do pescado" },
    { value: "FORMACAO", label: "Formação" },
    { value: "PESCA_SUSTENTAVEL", label: "Pesca sustentável" },
    { value: "COMUNIDADES_PESQUEIRAS", label: "Apoio às comunidades pesqueiras" },
  ],
  ARTESANATO: [
    { value: "FORMACAO", label: "Formação" },
    { value: "EQUIPAMENTOS", label: "Equipamentos" },
    { value: "MATERIAIS", label: "Materiais" },
    { value: "PEQUENOS_NEGOCIOS", label: "Apoio a pequenos negócios" },
    { value: "MULHERES_EMPREENDEDORAS", label: "Mulheres empreendedoras" },
    { value: "JOVENS_EMPREENDEDORES", label: "Jovens empreendedores" },
    { value: "COMERCIALIZACAO", label: "Comercialização de produtos" },
  ],
  ALIMENTACAO: [
    { value: "SEGURANCA_ALIMENTAR", label: "Segurança alimentar" },
    { value: "NUTRICAO", label: "Nutrição" },
    { value: "DISTRIBUICAO_ALIMENTOS", label: "Distribuição de alimentos" },
    { value: "HORTAS_COMUNITARIAS", label: "Hortas comunitárias" },
    { value: "OUTRO", label: "Outro" },
  ],
  JUVENTUDE: [
    { value: "FORMACAO", label: "Formação" },
    { value: "EMPREGO", label: "Emprego" },
    { value: "EMPREENDEDORISMO", label: "Empreendedorismo" },
    { value: "DESPORTO_CULTURA", label: "Desporto e cultura" },
    { value: "OUTRO", label: "Outro" },
  ],
  AMBIENTE: [
    { value: "REFLORESTACAO", label: "Reflorestação" },
    { value: "MANGAL", label: "Proteção do mangal" },
    { value: "RESIDUOS", label: "Resíduos" },
    { value: "AGUA", label: "Água" },
    { value: "CLIMA", label: "Adaptação ao clima" },
    { value: "OUTRO", label: "Outro" },
  ],
  COMUNITARIO: [
    { value: "INFRAESTRUTURAS", label: "Infraestruturas" },
    { value: "AGUA_SANEAMENTO", label: "Água e saneamento" },
    { value: "EDUCACAO", label: "Educação" },
    { value: "SAUDE", label: "Saúde" },
    { value: "ORGANIZACAO_COMUNITARIA", label: "Organização comunitária" },
    { value: "OUTRO", label: "Outro" },
  ],
  OUTRO: [{ value: "OUTRO", label: "Outro" }],
};

export const PROJECT_STATUS: Option[] = [
  { value: "PLANEAMENTO", label: "Em planeamento" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
];

export const DOCUMENT_KINDS: Option[] = [
  { value: "REGISTO_OFICIAL", label: "Registo oficial da organização" },
  { value: "ESTATUTOS", label: "Estatutos" },
  { value: "IDENTIFICACAO_RESPONSAVEL", label: "Identificação do responsável" },
  { value: "COMPROVATIVO_ENDERECO", label: "Comprovativo de morada" },
  { value: "RELATORIO_ATIVIDADES", label: "Relatório de atividades" },
  { value: "OUTRO", label: "Outro documento" },
];

export const RESULT_INDICATORS: (Option & { unit: string })[] = [
  { value: "PRODUCAO_KG", label: "Produção gerada", unit: "kg" },
  { value: "PESCADO_KG", label: "Pescado capturado", unit: "kg" },
  { value: "EMPREGOS_CRIADOS", label: "Empregos criados", unit: "empregos" },
  { value: "PESSOAS_FORMADAS", label: "Pessoas formadas", unit: "pessoas" },
  { value: "AREA_CULTIVADA_HA", label: "Área cultivada", unit: "ha" },
  { value: "FAMILIAS_APOIADAS", label: "Famílias apoiadas", unit: "famílias" },
  { value: "EQUIPAMENTOS_ENTREGUES", label: "Equipamentos entregues", unit: "unidades" },
  { value: "OUTRO", label: "Outro resultado", unit: "" },
];

export const COMMUNITY_TYPES: Option[] = [
  { value: "RURAL", label: "Comunidade rural" },
  { value: "COSTEIRA", label: "Comunidade costeira" },
  { value: "ILHA", label: "Ilha" },
  { value: "URBANA", label: "Bairro urbano" },
];

export const SECTORS: Option[] = [
  { value: "AGRICULTURA", label: "Agricultor" },
  { value: "PESCA", label: "Pescador" },
  { value: "ARTESANATO", label: "Artesão" },
  { value: "COOPERATIVA", label: "Cooperativa" },
  { value: "OUTRO", label: "Outro" },
];

export const GENDERS: Option[] = [
  { value: "F", label: "Mulher" },
  { value: "M", label: "Homem" },
  { value: "OUTRO", label: "Outro" },
];

export const NEED_CATEGORIES: Option[] = [
  { value: "SEMENTES", label: "Sementes" },
  { value: "EQUIPAMENTOS_AGRICOLAS", label: "Equipamentos agrícolas" },
  { value: "AGUA_IRRIGACAO", label: "Água e irrigação" },
  { value: "FORMACAO", label: "Formação" },
  { value: "EQUIPAMENTOS_PESCA", label: "Equipamentos de pesca" },
  { value: "CONSERVACAO_PESCADO", label: "Gelo e conservação do pescado" },
  { value: "SEGURANCA_MAR", label: "Segurança no mar" },
  { value: "MATERIAIS_ARTESANATO", label: "Materiais de artesanato" },
  { value: "FINANCIAMENTO", label: "Financiamento" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "ARMAZENAMENTO", label: "Armazenamento" },
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "SAUDE", label: "Saúde" },
  { value: "EDUCACAO", label: "Educação" },
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
  { value: "EM_APOIO", label: "Em apoio" },
  { value: "ATENDIDA", label: "Atendida" },
];

export const REQUEST_STATUS: Option[] = [
  { value: "NOVO", label: "Novo" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "ACEITE", label: "Aceite" },
  { value: "RECUSADO", label: "Recusado" },
  { value: "CONCLUIDO", label: "Concluído" },
];

export const PARTNER_TYPES: Option[] = [
  { value: "ONG", label: "Outra ONG" },
  { value: "COOPERATIVA", label: "Cooperativa" },
  { value: "EMPRESA", label: "Empresa" },
  { value: "INSTITUICAO_PUBLICA", label: "Instituição pública" },
  { value: "INTERNACIONAL", label: "Organização internacional" },
  { value: "ASSOCIACAO", label: "Associação comunitária" },
  { value: "LOCAL", label: "Parceiro local" },
  { value: "FINANCEIRO", label: "Parceiro financeiro" },
];

export const PARTNER_STATUS: Option[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "EM_NEGOCIACAO", label: "Em negociação" },
  { value: "ENCERRADO", label: "Encerrado" },
];

export const FUNDING_KINDS: Option[] = [
  { value: "SUBVENCAO", label: "Subvenção" },
  { value: "DOACAO", label: "Doação" },
  { value: "FINANCIAMENTO", label: "Financiamento" },
  { value: "OUTRO", label: "Outro" },
];

export const FUNDING_STATUS: Option[] = [
  { value: "PROSPECCAO", label: "Em prospeção" },
  { value: "SOLICITADO", label: "Solicitado" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "RECEBIDO", label: "Recebido" },
  { value: "RECUSADO", label: "Recusado" },
  { value: "ENCERRADO", label: "Encerrado" },
];

export const EXPENSE_CATEGORIES: Option[] = [
  { value: "EQUIPAMENTOS", label: "Equipamentos" },
  { value: "MATERIAIS", label: "Materiais" },
  { value: "PESSOAL", label: "Pessoal" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "FORMACAO", label: "Formação" },
  { value: "COMUNICACAO", label: "Comunicação" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "OUTRO", label: "Outro" },
];

export const TRAINING_KINDS: Option[] = [
  { value: "CURSO", label: "Curso" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "SEMINARIO", label: "Seminário" },
];

export const ENROLL_STATUS: Option[] = [
  { value: "INSCRITO", label: "Inscrito" },
  { value: "PRESENTE", label: "Presente" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "FALTOU", label: "Faltou" },
  { value: "CANCELADO", label: "Cancelado" },
];

export const OPPORTUNITY_KINDS: Option[] = [
  { value: "BOLSA", label: "Bolsa" },
  { value: "FORMACAO", label: "Formação" },
  { value: "EMPREGO", label: "Emprego" },
  { value: "CONCURSO", label: "Concurso" },
  { value: "PROJETO", label: "Projeto" },
  { value: "FINANCIAMENTO", label: "Financiamento" },
  { value: "PROGRAMA_APOIO", label: "Programa de apoio" },
];

export const APPLICATION_STATUS: Option[] = [
  { value: "ENVIADA", label: "Enviada" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "ACEITE", label: "Aceite" },
  { value: "RECUSADA", label: "Recusada" },
];

export const PUBLICATION_KINDS: Option[] = [
  { value: "NOTICIA", label: "Notícia" },
  { value: "PROJETO", label: "Projeto" },
  { value: "RESULTADO", label: "Resultado" },
  { value: "CAMPANHA", label: "Campanha" },
  { value: "EVENTO", label: "Evento" },
  { value: "FOTO", label: "Fotografias" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "HISTORIA", label: "História da comunidade" },
];

export function values(list: Option[]): string[] {
  return list.map((o) => o.value);
}

export function catalog() {
  return {
    areas: AREAS,
    focus: FOCUS,
    projectStatus: PROJECT_STATUS,
    documentKinds: DOCUMENT_KINDS,
    resultIndicators: RESULT_INDICATORS,
    communityTypes: COMMUNITY_TYPES,
    sectors: SECTORS,
    genders: GENDERS,
    needCategories: NEED_CATEGORIES,
    needPriority: NEED_PRIORITY,
    needStatus: NEED_STATUS,
    requestStatus: REQUEST_STATUS,
    partnerTypes: PARTNER_TYPES,
    partnerStatus: PARTNER_STATUS,
    fundingKinds: FUNDING_KINDS,
    fundingStatus: FUNDING_STATUS,
    expenseCategories: EXPENSE_CATEGORIES,
    trainingKinds: TRAINING_KINDS,
    enrollStatus: ENROLL_STATUS,
    opportunityKinds: OPPORTUNITY_KINDS,
    applicationStatus: APPLICATION_STATUS,
    publicationKinds: PUBLICATION_KINDS,
  };
}
