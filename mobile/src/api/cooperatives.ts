import { api } from "./client";

export async function getCooperatives(region?: string) {
  const response = await api.get("/api/cooperatives", {
    params: region ? { region } : undefined,
  });
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data?.cooperatives ?? [];
}

export async function createCooperative(data: {
  name: string;
  region: string;
  description?: string;
}) {
  const response = await api.post("/api/cooperatives", data);
  return response.data;
}

export async function joinCooperative(id: string) {
  const response = await api.post(`/api/cooperatives/${id}/join`);
  return response.data;
}

export async function leaveCooperative(id: string) {
  await api.delete(`/api/cooperatives/${id}/leave`);
}
