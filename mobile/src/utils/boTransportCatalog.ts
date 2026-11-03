import { useEffect, useState } from "react";
import { getBoTransportCatalog } from "../api/backofficeTransport";
import { Option } from "./ngoCatalog";

export interface BoTransportCatalog {
  serviceKinds: Option[];
  serviceStatus: Option[];
  serviceReviewDecisions: Option[];
  incidentKinds: Option[];
  incidentStatus: Option[];
  payoutStatus: Option[];
  payoutOutcomes: Option[];
  auditActionsTransport: Option[];
}

export const EMPTY_BO_TRANSPORT_CATALOG: BoTransportCatalog = {
  serviceKinds: [],
  serviceStatus: [],
  serviceReviewDecisions: [],
  incidentKinds: [],
  incidentStatus: [],
  payoutStatus: [],
  payoutOutcomes: [],
  auditActionsTransport: [],
};

let cached: BoTransportCatalog | null = null;

export function useBoTransportCatalog(): BoTransportCatalog {
  const [catalog, setCatalog] = useState<BoTransportCatalog>(cached ?? EMPTY_BO_TRANSPORT_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      getBoTransportCatalog()
        .then((c: any) => {
          if ((c.serviceKinds ?? []).length > 0) cached = { ...EMPTY_BO_TRANSPORT_CATALOG, ...c };
          if (alive && cached) setCatalog(cached);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);

  return catalog;
}
