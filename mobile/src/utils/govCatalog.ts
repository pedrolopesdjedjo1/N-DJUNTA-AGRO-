import { useEffect, useState } from "react";
import { getGovCatalog } from "../api/gov";
import { Option } from "./ngoCatalog";

export interface GovCatalog {
  institutionTypes: Option[];
  govDocumentKinds: Option[];
  govPublicationKinds: Option[];
  alertKinds: Option[];
  alertSeverity: Option[];
  serviceCategories: Option[];
  serviceStatus: Option[];
  placeKinds: Option[];
  placeSubtypes: Record<string, Option[]>;
  placeStatus: Option[];
  reportCategories: Option[];
  reportStatus: Option[];
}

export const EMPTY_GOV_CATALOG: GovCatalog = {
  institutionTypes: [],
  govDocumentKinds: [],
  govPublicationKinds: [],
  alertKinds: [],
  alertSeverity: [],
  serviceCategories: [],
  serviceStatus: [],
  placeKinds: [],
  placeSubtypes: {},
  placeStatus: [],
  reportCategories: [],
  reportStatus: [],
};

let cached: GovCatalog | null = null;
let pending: Promise<GovCatalog> | null = null;

export function loadGovCatalog(): Promise<GovCatalog> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = getGovCatalog()
      .then((data: any) => {
        cached = { ...EMPTY_GOV_CATALOG, ...data };
        return cached as GovCatalog;
      })
      .catch((e: any) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

// Os nomes e as opções do Governo vêm do servidor, por isso ficam iguais em todas as telas
export function useGovCatalog(): GovCatalog {
  const [catalog, setCatalog] = useState<GovCatalog>(cached ?? EMPTY_GOV_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadGovCatalog()
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
