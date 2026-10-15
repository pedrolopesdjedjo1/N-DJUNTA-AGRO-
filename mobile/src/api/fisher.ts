import { api } from "./client";
import { cleanParams } from "./products";

export async function getFisherDashboard() {
  return (await api.get("/api/fisher/dashboard")).data;
}

export async function getCatches(params: { status?: string; q?: string; days?: number } = {}) {
  return (await api.get("/api/fisher/catches", { params: cleanParams(params) })).data;
}

export async function createCatch(body: Record<string, any>) {
  return (await api.post("/api/fisher/catches", body)).data;
}

export async function updateCatch(id: string, body: Record<string, any>) {
  return (await api.patch(`/api/fisher/catches/${id}`, body)).data;
}

export async function markCatchSold(id: string) {
  return (await api.post(`/api/fisher/catches/${id}/sold`)).data;
}

export async function deleteCatch(id: string) {
  return (await api.delete(`/api/fisher/catches/${id}`)).data;
}

export async function publishCatch(id: string, body: { price: number; quantity?: number; unit?: string; description?: string }) {
  return (await api.post(`/api/fisher/catches/${id}/publish`, body)).data;
}

export async function getFishPrices(params: { q?: string; region?: string } = {}) {
  return (await api.get("/api/fisher/prices", { params: cleanParams(params) })).data;
}

export async function getFisherProfile() {
  return (await api.get("/api/fisher/profile")).data;
}

export async function saveFisherProfile(body: Record<string, any>) {
  return (await api.put("/api/fisher/profile", body)).data;
}

export async function getFisherCooperative(id: string) {
  return (await api.get(`/api/fisher/cooperatives/${id}`)).data;
}
