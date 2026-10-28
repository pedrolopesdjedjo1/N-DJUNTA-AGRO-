import { useEffect, useState } from "react";
import {
  getBoCatalogCore,
  getBoCatalogUsers,
  getBoCatalogOps,
  getBoCatalogFinance,
  getBoCatalogOrgs,
  getBoCatalogContent,
} from "../api/backoffice";
import { Option } from "./ngoCatalog";

export interface BoCatalog {
  levels: any[];
  permissions: any[];
  levelPermissions: Record<string, string[]>;
  reservedPermissions: string[];
  auditActions: Option[];
  securityEventKinds: Option[];
  adminStatus: Option[];
  roles: Option[];
  profileKinds: any[];
  sanctionKinds: Option[];
  identityKinds: Option[];
  identityStatus: Option[];
  reportTargets: Option[];
  reportCategories: Option[];
  reportStatus: Option[];
  reportDecisions: Option[];
  departments: any[];
  marketStatus: Option[];
  marketSorts: Option[];
  moderationReasons: Option[];
  qualityFlags: Option[];
  orderGroups: Option[];
  orderProblems: Option[];
  disputeReasons: Option[];
  disputeStatus: Option[];
  disputeDecisions: Option[];
  transporterSorts: Option[];
  paymentStates: Option[];
  refundStatus: Option[];
  transactionKinds: Option[];
  flagRules: Option[];
  coopStatus: Option[];
  contentKinds: Option[];
  broadcastKinds: Option[];
  alertKinds: string[];
  severities: Option[];
  audiences: Option[];
  suggestedAudience: Record<string, string[]>;
  hideKinds: Option[];
  highlightKinds: Option[];
  bannerLinks: Option[];
  eventGroups: Option[];
  ticketStatus: Option[];
  ticketCategories: Option[];
  statSegments: any[];
}

export const EMPTY_BO_CATALOG: BoCatalog = {
  levels: [],
  permissions: [],
  levelPermissions: {},
  reservedPermissions: [],
  auditActions: [],
  securityEventKinds: [],
  adminStatus: [],
  roles: [],
  profileKinds: [],
  sanctionKinds: [],
  identityKinds: [],
  identityStatus: [],
  reportTargets: [],
  reportCategories: [],
  reportStatus: [],
  reportDecisions: [],
  departments: [],
  marketStatus: [],
  marketSorts: [],
  moderationReasons: [],
  qualityFlags: [],
  orderGroups: [],
  orderProblems: [],
  disputeReasons: [],
  disputeStatus: [],
  disputeDecisions: [],
  transporterSorts: [],
  paymentStates: [],
  refundStatus: [],
  transactionKinds: [],
  flagRules: [],
  coopStatus: [],
  contentKinds: [],
  broadcastKinds: [],
  alertKinds: [],
  severities: [],
  audiences: [],
  suggestedAudience: {},
  hideKinds: [],
  highlightKinds: [],
  bannerLinks: [],
  eventGroups: [],
  ticketStatus: [],
  ticketCategories: [],
  statSegments: [],
};

let cached: BoCatalog | null = null;
let pending: Promise<BoCatalog> | null = null;

const quiet = (work: () => Promise<any>) => work().catch(() => ({}));

export function loadBoCatalog(): Promise<BoCatalog> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = Promise.all([
      quiet(getBoCatalogCore),
      quiet(getBoCatalogUsers),
      quiet(getBoCatalogOps),
      quiet(getBoCatalogFinance),
      quiet(getBoCatalogOrgs),
      quiet(getBoCatalogContent),
    ]).then(([core, users, ops, finance, orgs, content]) => {
      const merged: any = { ...EMPTY_BO_CATALOG, ...core, ...users, ...ops, ...finance, ...orgs, ...content };
      // As ações do registo de atividades vêm de várias partes
      merged.auditActions = [
        ...(core.auditActions ?? []),
        ...(ops.auditActionsExtra ?? []),
        ...(finance.auditActionsFinance ?? []),
        ...(content.auditActionsContent ?? []),
      ];

      // Só guarda quando chegou alguma coisa, para tentar de novo se a rede falhou
      if ((core.levels ?? []).length > 0) cached = merged as BoCatalog;
      pending = null;
      return merged as BoCatalog;
    });
  }
  return pending;
}

// As listas e os nomes da administração vêm do servidor, por isso ficam iguais em todas as telas
export function useBoCatalog(): BoCatalog {
  const [catalog, setCatalog] = useState<BoCatalog>(cached ?? EMPTY_BO_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadBoCatalog()
        .then((c) => {
          if (alive) setCatalog(c);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);

  return catalog;
}
