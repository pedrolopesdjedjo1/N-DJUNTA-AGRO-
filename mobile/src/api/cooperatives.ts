import { api } from "./client";

export async function getCooperatives() {
  const response = await api.get("/api/cooperatives");
  return response.data.cooperatives || response.data || [];
}
