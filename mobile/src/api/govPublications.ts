import { api } from "./client";

// Publicações de todas as organizações e instituições, com filtro por região e só as oficiais
export async function listPublicationsFeed(
  filters: { kind?: string; region?: string; q?: string; page?: number; official?: boolean; ownerId?: string } = {}
) {
  const params: Record<string, any> = {};
  Object.keys(filters).forEach((key) => {
    const value = (filters as any)[key];
    if (value === undefined || value === null || value === "" || value === false) return;
    params[key] = value === true ? "true" : value;
  });
  return (await api.get("/api/publications", { params })).data;
}
