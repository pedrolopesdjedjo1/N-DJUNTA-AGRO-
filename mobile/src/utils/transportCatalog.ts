import { useEffect, useState } from "react";
import { getTransportCatalog } from "../api/transporter";
import { Option } from "./ngoCatalog";

export interface TransportCatalog {
  vehicleTypes: Option[];
  deliveryPhases: Option[];
  problemKinds: Option[];
  releaseReasons: Option[];
  eventKinds: Option[];
  deliverySorts: Option[];
  documentKinds: Option[];
  verificationStatus: Option[];
}

export const EMPTY_TRANSPORT_CATALOG: TransportCatalog = {
  vehicleTypes: [],
  deliveryPhases: [],
  problemKinds: [],
  releaseReasons: [],
  eventKinds: [],
  deliverySorts: [],
  documentKinds: [],
  verificationStatus: [],
};

let cached: TransportCatalog | null = null;
let pending: Promise<TransportCatalog> | null = null;

export function loadTransportCatalog(): Promise<TransportCatalog> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = getTransportCatalog()
      .then((data: any) => {
        cached = { ...EMPTY_TRANSPORT_CATALOG, ...data };
        return cached as TransportCatalog;
      })
      .catch((e: any) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

// Os nomes e as opções do transportador vêm do servidor, por isso ficam iguais em todas as telas
export function useTransportCatalog(): TransportCatalog {
  const [catalog, setCatalog] = useState<TransportCatalog>(cached ?? EMPTY_TRANSPORT_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadTransportCatalog()
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
