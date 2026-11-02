import { useEffect, useState } from "react";
import { getTrCatalog, getTrCatalogBusiness, getTrCatalogTools } from "../api/transporterV2";
import { Option } from "./ngoCatalog";

export interface TrCatalog {
  vehicleTypes: Option[];
  vehicleStatus: Option[];
  transporterKinds: Option[];
  cargoTypes: Option[];
  compatMessages: Record<string, string>;
  deliveryPhases: Option[];
  problemKinds: Option[];
  releaseReasons: Option[];
  eventKinds: Option[];
  deliverySorts: Option[];
  documentKinds: Option[];
  vehicleDocumentKinds: string[];
  verificationStatus: Option[];
  expenseKinds: Option[];
  payoutStatus: Option[];
  paymentMethods: Option[];
  contactVia: Option[];
  directoryKinds: any[];
  offerStatus: Option[];
  requestStatus: Option[];
  badges: Option[];
  serviceKinds: Option[];
  serviceStatus: Option[];
  incidentKinds: Option[];
  incidentStatus: Option[];
}

export const EMPTY_TR_CATALOG: TrCatalog = {
  vehicleTypes: [],
  vehicleStatus: [],
  transporterKinds: [],
  cargoTypes: [],
  compatMessages: {},
  deliveryPhases: [],
  problemKinds: [],
  releaseReasons: [],
  eventKinds: [],
  deliverySorts: [],
  documentKinds: [],
  vehicleDocumentKinds: [],
  verificationStatus: [],
  expenseKinds: [],
  payoutStatus: [],
  paymentMethods: [],
  contactVia: [],
  directoryKinds: [],
  offerStatus: [],
  requestStatus: [],
  badges: [],
  serviceKinds: [],
  serviceStatus: [],
  incidentKinds: [],
  incidentStatus: [],
};

let cached: TrCatalog | null = null;
let pending: Promise<TrCatalog> | null = null;

const quiet = (work: () => Promise<any>) => work().catch(() => ({}));

export function loadTrCatalog(): Promise<TrCatalog> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = Promise.all([quiet(getTrCatalog), quiet(getTrCatalogBusiness), quiet(getTrCatalogTools)]).then(([core, business, tools]) => {
      const merged = { ...EMPTY_TR_CATALOG, ...core, ...business, ...tools } as TrCatalog;

      // Só guarda quando chegou alguma coisa, para tentar de novo se a rede falhou
      if ((core.vehicleTypes ?? []).length > 0) cached = merged;
      pending = null;
      return merged;
    });
  }
  return pending;
}

// As listas e os nomes do Transportador vêm do servidor, por isso ficam iguais em todas as telas
export function useTrCatalog(): TrCatalog {
  const [catalog, setCatalog] = useState<TrCatalog>(cached ?? EMPTY_TR_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadTrCatalog()
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
