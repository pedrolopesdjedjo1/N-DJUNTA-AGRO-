import { Option } from "./ngoCatalog";

export const INSTITUTION_TYPES: Option[] = [
  { value: "MINISTERIO", label: "Ministério" },
  { value: "SECRETARIA_ESTADO", label: "Secretaria de Estado" },
  { value: "DIRECAO_GERAL", label: "Direção-geral" },
  { value: "DIRECAO_REGIONAL", label: "Direção regional" },
  { value: "DELEGACIA", label: "Delegacia" },
  { value: "MUNICIPIO", label: "Município ou câmara" },
  { value: "INSTITUTO", label: "Instituto público" },
  { value: "SERVICO_PUBLICO", label: "Serviço público" },
  { value: "OUTRO", label: "Outra instituição" },
];

export const GOV_DOCUMENT_KINDS: Option[] = [
  { value: "DIPLOMA_CRIACAO", label: "Diploma ou despacho de criação" },
  { value: "NOMEACAO_RESPONSAVEL", label: "Nomeação do responsável" },
  { value: "COMPROVATIVO_MORADA", label: "Comprovativo de morada" },
];

export const GOV_PUBLICATION_KINDS: Option[] = [
  { value: "COMUNICADO", label: "Comunicado oficial" },
  { value: "AVISO", label: "Aviso oficial" },
  { value: "INFORMACAO", label: "Informação importante" },
];

export const ALERT_KINDS: Option[] = [
  { value: "CHUVA", label: "Chuva forte" },
  { value: "SECA", label: "Seca" },
  { value: "TEMPESTADE", label: "Tempestade" },
  { value: "INUNDACAO", label: "Inundação" },
  { value: "AGRICOLA", label: "Alerta agrícola" },
  { value: "MARITIMO", label: "Alerta marítimo" },
  { value: "EMERGENCIA", label: "Emergência" },
  { value: "OUTRO", label: "Outro alerta" },
];

export const ALERT_SEVERITY: Option[] = [
  { value: "INFO", label: "Informação" },
  { value: "ATENCAO", label: "Atenção" },
  { value: "ALERTA", label: "Alerta" },
  { value: "EMERGENCIA", label: "Emergência" },
];

export const SERVICE_CATEGORIES: Option[] = [
  { value: "DOCUMENTOS", label: "Documentos e registos" },
  { value: "AGRICULTURA", label: "Agricultura" },
  { value: "PESCA", label: "Pesca" },
  { value: "COMERCIO", label: "Comércio e licenças" },
  { value: "AMBIENTE", label: "Ambiente" },
  { value: "TERRAS", label: "Terras e propriedade" },
  { value: "SAUDE", label: "Saúde" },
  { value: "EDUCACAO", label: "Educação" },
  { value: "FORMACAO_EMPREGO", label: "Formação e emprego" },
  { value: "APOIO_SOCIAL", label: "Apoio social" },
  { value: "OUTRO", label: "Outro serviço" },
];

export const SERVICE_STATUS: Option[] = [
  { value: "DISPONIVEL", label: "Disponível" },
  { value: "POR_MARCACAO", label: "Só com marcação" },
  { value: "TEMPORARIO", label: "Temporariamente indisponível" },
  { value: "ENCERRADO", label: "Encerrado" },
];

export const PLACE_KINDS: Option[] = [
  { value: "INFRAESTRUTURA", label: "Infraestrutura" },
  { value: "MERCADO", label: "Mercado" },
  { value: "ZONA_PRODUCAO", label: "Zona de produção" },
];

export const PLACE_SUBTYPES: Record<string, Option[]> = {
  INFRAESTRUTURA: [
    { value: "ESTRADA", label: "Estrada ou ponte" },
    { value: "ARMAZEM", label: "Armazém" },
    { value: "FRIO", label: "Câmara frigorífica ou fábrica de gelo" },
    { value: "PORTO", label: "Porto ou cais" },
    { value: "AGUA", label: "Poço ou furo de água" },
    { value: "IRRIGACAO", label: "Irrigação ou represa" },
    { value: "CENTRO_COMUNITARIO", label: "Centro comunitário" },
    { value: "ENERGIA", label: "Energia" },
    { value: "OUTRA", label: "Outra infraestrutura" },
  ],
  MERCADO: [
    { value: "MERCADO_LOCAL", label: "Mercado local" },
    { value: "FEIRA", label: "Feira" },
    { value: "LOTA", label: "Lota (venda de pescado)" },
    { value: "ATACADO", label: "Mercado grossista" },
    { value: "OUTRO", label: "Outro mercado" },
  ],
  ZONA_PRODUCAO: [
    { value: "ARROZ", label: "Bolanhas de arroz" },
    { value: "CAJU", label: "Pomares de caju" },
    { value: "HORTICULTURA", label: "Horticultura" },
    { value: "FRUTICULTURA", label: "Fruticultura" },
    { value: "PECUARIA", label: "Pecuária" },
    { value: "PESCA", label: "Zona de pesca" },
    { value: "MARISCO", label: "Marisco e ostras" },
    { value: "OUTRA", label: "Outra zona" },
  ],
};

export const PLACE_STATUS: Option[] = [
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "DANIFICADA", label: "Danificada" },
  { value: "EM_CONSTRUCAO", label: "Em construção" },
  { value: "ENCERRADA", label: "Encerrada" },
];

export const REPORT_CATEGORIES: Option[] = [
  { value: "PEDIDO_APOIO", label: "Pedido de apoio" },
  { value: "PROBLEMA_AGRICOLA", label: "Problema agrícola" },
  { value: "PROBLEMA_PESCA", label: "Problema de pesca" },
  { value: "INFRAESTRUTURA", label: "Infraestrutura danificada" },
  { value: "MERCADO", label: "Problema de mercado" },
  { value: "DENUNCIA", label: "Denúncia" },
  { value: "SUGESTAO", label: "Sugestão" },
];

export const REPORT_STATUS: Option[] = [
  { value: "RECEBIDO", label: "Recebido" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "ENCAMINHADO", label: "Encaminhado" },
  { value: "RESOLVIDO", label: "Resolvido" },
  { value: "REJEITADO", label: "Não aceite" },
];

export function govCatalog() {
  return {
    institutionTypes: INSTITUTION_TYPES,
    govDocumentKinds: GOV_DOCUMENT_KINDS,
    govPublicationKinds: GOV_PUBLICATION_KINDS,
    alertKinds: ALERT_KINDS,
    alertSeverity: ALERT_SEVERITY,
    serviceCategories: SERVICE_CATEGORIES,
    serviceStatus: SERVICE_STATUS,
    placeKinds: PLACE_KINDS,
    placeSubtypes: PLACE_SUBTYPES,
    placeStatus: PLACE_STATUS,
    reportCategories: REPORT_CATEGORIES,
    reportStatus: REPORT_STATUS,
  };
}
