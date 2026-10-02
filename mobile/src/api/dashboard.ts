import { api } from "./client";

export type RoleCount = { role: string; _count?: { role?: number } };
export type CategoryCount = { category: string | null; _count?: { category?: number } };
export type LocationCount = { location: string | null; _count?: { location?: number } };

export type Overview = {
  usersByRole: RoleCount[];
  productsByCategory: CategoryCount[];
  productsByLocation: LocationCount[];
  totalConfirmedTransactions: number;
};

export type GrowthItem = { month: string; newUsers: number };

const BASE_PATHS = ["/api/dashboard", "/api/dashboards"];
let workingBase: string | null = null;

async function withBase<T>(call: (base: string) => Promise<T>): Promise<T> {
  const candidates = workingBase ? [workingBase] : BASE_PATHS;
  let lastError: any;

  for (const base of candidates) {
    try {
      const result = await call(base);
      workingBase = base;
      return result;
    } catch (err: any) {
      lastError = err;
      if (err?.response?.status !== 404) {
        throw err;
      }
    }
  }
  throw lastError;
}

export function dashboardErrorMessage(err: any): string {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    "Não foi possível carregar o dashboard."
  );
}

export async function getOverview(): Promise<Overview> {
  return withBase(async (base) => {
    const response = await api.get(`${base}/overview`);
    return response.data;
  });
}

export async function getGrowth(): Promise<GrowthItem[]> {
  return withBase(async (base) => {
    const response = await api.get(`${base}/growth`);
    const data = response.data;
    return Array.isArray(data) ? data : [];
  });
}
