import { useEffect, useState } from "react";
import { getAgentCatalog, getAgentFinanceCatalog, getAgentOpsCatalog } from "../api/agent";
import { Option } from "./ngoCatalog";

export interface AgentCatalog {
  agentTypes: Option[];
  agentAreas: Option[];
  documentKinds: Option[];
  agentStatus: Option[];
  clientKinds: Option[];
  linkStatus: Option[];
  activityKinds: Option[];
  manualActivityKinds: Option[];
  assistReasons: Option[];
  taskKinds: Option[];
  taskPriority: Option[];
  needCategories: Option[];
  needPriority: Option[];
  needStatus: Option[];
  producerKinds: Option[];
  referralTypes: Option[];
  orderStages: Option[];
  orderActions: Option[];
  caseCategories: Option[];
  caseStatus: Option[];
  productSorts: Option[];
  commissionStatus: Option[];
  commissionReasons: Option[];
  securityKinds: Option[];
  securityStatus: Option[];
}

export const EMPTY_AGENT_CATALOG: AgentCatalog = {
  agentTypes: [],
  agentAreas: [],
  documentKinds: [],
  agentStatus: [],
  clientKinds: [],
  linkStatus: [],
  activityKinds: [],
  manualActivityKinds: [],
  assistReasons: [],
  taskKinds: [],
  taskPriority: [],
  needCategories: [],
  needPriority: [],
  needStatus: [],
  producerKinds: [],
  referralTypes: [],
  orderStages: [],
  orderActions: [],
  caseCategories: [],
  caseStatus: [],
  productSorts: [],
  commissionStatus: [],
  commissionReasons: [],
  securityKinds: [],
  securityStatus: [],
};

let cached: AgentCatalog | null = null;
let pending: Promise<AgentCatalog> | null = null;

export function loadAgentCatalog(): Promise<AgentCatalog> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = Promise.all([getAgentCatalog(), getAgentOpsCatalog(), getAgentFinanceCatalog()])
      .then(([a, b, c]) => {
        cached = { ...EMPTY_AGENT_CATALOG, ...a, ...b, ...c };
        return cached as AgentCatalog;
      })
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

// As listas e os nomes do agente vêm do servidor, por isso ficam iguais em todas as telas
export function useAgentCatalog(): AgentCatalog {
  const [catalog, setCatalog] = useState<AgentCatalog>(cached ?? EMPTY_AGENT_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadAgentCatalog()
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
