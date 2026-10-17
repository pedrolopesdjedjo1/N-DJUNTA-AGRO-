import { useEffect, useState } from "react";
import { getNgoCatalog } from "../api/ngo";

export interface Option {
  value: string;
  label: string;
  icon?: string;
  unit?: string;
}

export interface NgoCatalog {
  areas: Option[];
  focus: Record<string, Option[]>;
  projectStatus: Option[];
  documentKinds: Option[];
  resultIndicators: Option[];
  communityTypes: Option[];
  sectors: Option[];
  genders: Option[];
  needCategories: Option[];
  needPriority: Option[];
  needStatus: Option[];
  requestStatus: Option[];
  partnerTypes: Option[];
  partnerStatus: Option[];
  fundingKinds: Option[];
  fundingStatus: Option[];
  expenseCategories: Option[];
  trainingKinds: Option[];
  enrollStatus: Option[];
  opportunityKinds: Option[];
  applicationStatus: Option[];
  publicationKinds: Option[];
}

export const EMPTY_CATALOG: NgoCatalog = {
  areas: [],
  focus: {},
  projectStatus: [],
  documentKinds: [],
  resultIndicators: [],
  communityTypes: [],
  sectors: [],
  genders: [],
  needCategories: [],
  needPriority: [],
  needStatus: [],
  requestStatus: [],
  partnerTypes: [],
  partnerStatus: [],
  fundingKinds: [],
  fundingStatus: [],
  expenseCategories: [],
  trainingKinds: [],
  enrollStatus: [],
  opportunityKinds: [],
  applicationStatus: [],
  publicationKinds: [],
};

let cached: NgoCatalog | null = null;
let pending: Promise<NgoCatalog> | null = null;

export function loadNgoCatalog(): Promise<NgoCatalog> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = getNgoCatalog()
      .then((data: any) => {
        cached = { ...EMPTY_CATALOG, ...data };
        return cached as NgoCatalog;
      })
      .catch((e: any) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

// Os nomes e as opções vêm do servidor, por isso ficam iguais em todas as telas
export function useNgoCatalog(): NgoCatalog {
  const [catalog, setCatalog] = useState<NgoCatalog>(cached ?? EMPTY_CATALOG);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadNgoCatalog()
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

export function labelOf(list: Option[], value?: string | null): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.label ?? value;
}

export function iconOf(list: Option[], value?: string | null): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.icon ?? "";
}
