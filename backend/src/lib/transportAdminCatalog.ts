import { Option } from "./ngoCatalog";
import { SERVICE_KINDS, SERVICE_STATUS, INCIDENT_KINDS, INCIDENT_STATUS } from "./transportToolsCatalog";
import { PAYOUT_STATUS } from "./transportBusinessCatalog";

// Ações que a equipa regista no registo de atividades por causa do Transportador
export const TRANSPORT_AUDIT_ACTIONS: Option[] = [
  { value: "SERVICE_POINT_SAVE", label: "Criou ou editou um posto ou oficina" },
  { value: "SERVICE_POINT_REVIEW", label: "Publicou ou escondeu um posto ou oficina" },
  { value: "SERVICE_POINT_DELETE", label: "Apagou um posto ou oficina" },
  { value: "INCIDENT_HANDLE", label: "Atendeu uma ocorrência de transportador" },
  { value: "PAYOUT_RESOLVE", label: "Resolveu um pagamento de transporte reclamado" },
];

export const SERVICE_REVIEW_DECISIONS: Option[] = [
  { value: "PUBLICAR", label: "Publicar" },
  { value: "ESCONDER", label: "Esconder" },
];

export const PAYOUT_OUTCOMES: Option[] = [
  { value: "RECEBIDO", label: "Confirmar que foi pago" },
  { value: "PENDENTE", label: "Voltar a pôr por receber" },
];

export function transportAdminCatalog() {
  return {
    serviceKinds: SERVICE_KINDS,
    serviceStatus: SERVICE_STATUS,
    serviceReviewDecisions: SERVICE_REVIEW_DECISIONS,
    incidentKinds: INCIDENT_KINDS,
    incidentStatus: INCIDENT_STATUS,
    payoutStatus: PAYOUT_STATUS,
    payoutOutcomes: PAYOUT_OUTCOMES,
    auditActionsTransport: TRANSPORT_AUDIT_ACTIONS,
  };
}
