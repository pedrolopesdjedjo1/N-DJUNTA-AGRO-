import { UserRole } from "@prisma/client";
import { Option } from "./ngoCatalog";

export const ROLE_VALUES: string[] = Object.values(UserRole);

const NON_BUYER = ["AGRICULTOR", "PESCADOR", "ARTESAO", "COMERCIANTE", "TRANSPORTADOR", "ONG", "GOVERNO", "ADMIN", "AGENTE"];

// Todos os perfis que não são nenhum dos outros contam como cliente (compradores)
export const BUYER_ROLES: string[] = ROLE_VALUES.filter((r) => !NON_BUYER.includes(r));

// Perfis para onde um administrador pode mudar uma conta (administrador e agente têm o seu próprio fluxo)
export const EDITABLE_ROLES: string[] = ROLE_VALUES.filter((r) => r !== "ADMIN" && r !== "AGENTE");

const ROLE_NAMES: Record<string, string> = {
  AGRICULTOR: "Agricultor",
  PESCADOR: "Pescador",
  ARTESAO: "Artesão",
  COMERCIANTE: "Comerciante",
  TRANSPORTADOR: "Transportador",
  ONG: "ONG",
  GOVERNO: "Governo",
  ADMIN: "Administrador",
  AGENTE: "Agente",
};

export function roleName(role: any): string {
  const r = String(role);
  return ROLE_NAMES[r] ?? (BUYER_ROLES.includes(r) ? "Cliente" : r);
}

export const PROFILE_KINDS: { value: string; label: string; icon: string; roles: string[] | "BUYER" | "COOPERATIVAS" }[] = [
  { value: "AGRICULTORES", label: "Agricultores", icon: "🌾", roles: ["AGRICULTOR"] },
  { value: "PESCADORES", label: "Pescadores", icon: "🎣", roles: ["PESCADOR"] },
  { value: "ARTESAOS", label: "Artesãos", icon: "🧺", roles: ["ARTESAO"] },
  { value: "TRANSPORTADORES", label: "Transportadores", icon: "🚚", roles: ["TRANSPORTADOR"] },
  { value: "CLIENTES", label: "Clientes", icon: "🛒", roles: "BUYER" },
  { value: "ONGS", label: "ONGs", icon: "🌍", roles: ["ONG"] },
  { value: "GOVERNO", label: "Governo", icon: "🏛️", roles: ["GOVERNO"] },
  { value: "EMPRESAS", label: "Empresas e comerciantes", icon: "🏪", roles: ["COMERCIANTE"] },
  { value: "AGENTES", label: "Agentes", icon: "🤝", roles: ["AGENTE"] },
  { value: "COOPERATIVAS", label: "Cooperativas", icon: "🤲", roles: "COOPERATIVAS" },
];

export function rolesOfKind(kind: string): string[] | null {
  const def = PROFILE_KINDS.find((k) => k.value === kind);
  if (!def || def.roles === "COOPERATIVAS") return null;
  return def.roles === "BUYER" ? BUYER_ROLES : def.roles;
}

export const SANCTION_KINDS: Option[] = [
  { value: "SUSPENSAO", label: "Suspensão" },
  { value: "BLOQUEIO", label: "Bloqueio" },
];

export const IDENTITY_DOC_KINDS: Option[] = [
  { value: "BI", label: "Bilhete de identidade" },
  { value: "PASSAPORTE", label: "Passaporte" },
  { value: "CARTA_CONDUCAO", label: "Carta de condução" },
  { value: "CARTAO_ELEITOR", label: "Cartão de eleitor" },
  { value: "OUTRO", label: "Outro documento" },
];

export const IDENTITY_STATUS: Option[] = [
  { value: "PENDENTE", label: "Em análise" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "RECUSADA", label: "Recusada" },
];

export const REPORT_TARGETS: Option[] = [
  { value: "USER", label: "Utilizador" },
  { value: "PRODUCT", label: "Produto" },
  { value: "ORDER", label: "Encomenda" },
  { value: "DELIVERY", label: "Entrega" },
  { value: "PUBLICATION", label: "Publicação" },
  { value: "REVIEW", label: "Avaliação" },
  { value: "OTHER", label: "Outro" },
];

export const REPORT_CATEGORIES: Option[] = [
  { value: "FRAUDE", label: "Fraude ou burla" },
  { value: "CONTEUDO_INADEQUADO", label: "Conteúdo inadequado" },
  { value: "CONTA_SUSPEITA", label: "Conta suspeita" },
  { value: "PRODUTO_PROIBIDO", label: "Produto proibido" },
  { value: "RECLAMACAO", label: "Reclamação" },
  { value: "ABUSO", label: "Abuso ou assédio" },
  { value: "OUTRO", label: "Outro" },
];

export const REPORT_STATUS: Option[] = [
  { value: "ABERTA", label: "Aberta" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "RESOLVIDA", label: "Resolvida" },
  { value: "ARQUIVADA", label: "Arquivada" },
];

export const REPORT_DECISIONS: Option[] = [
  { value: "SEM_ACAO", label: "Sem ação (arquivar)" },
  { value: "AVISO", label: "Avisar a pessoa" },
  { value: "SUSPENDER", label: "Suspender a conta" },
  { value: "BLOQUEAR", label: "Bloquear a conta" },
  { value: "REMOVER_PRODUTO", label: "Remover o produto" },
];

export function isStorageUrl(url: any): boolean {
  return typeof url === "string" && url.startsWith("https://") && url.includes(".supabase.co/storage/v1/object/public/");
}

export function adminUsersCatalog() {
  return {
    roles: EDITABLE_ROLES.map((r) => ({ value: r, label: roleName(r) })),
    profileKinds: PROFILE_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon })),
    sanctionKinds: SANCTION_KINDS,
    identityKinds: IDENTITY_DOC_KINDS,
    identityStatus: IDENTITY_STATUS,
    reportTargets: REPORT_TARGETS,
    reportCategories: REPORT_CATEGORIES,
    reportStatus: REPORT_STATUS,
    reportDecisions: REPORT_DECISIONS,
  };
}
