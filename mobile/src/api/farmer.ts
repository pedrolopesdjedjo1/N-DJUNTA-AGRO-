import { api } from "./client";
import { cleanParams } from "./products";

export async function getFarmerDashboard() {
  return (await api.get("/api/farmer/dashboard")).data;
}

export async function getProduction() {
  return (await api.get("/api/farmer/production")).data;
}

export async function updateQuantity(productId: string, quantity: number) {
  return (await api.patch(`/api/farmer/products/${productId}/quantity`, { quantity })).data;
}

export async function markSold(productId: string) {
  return (await api.post(`/api/farmer/products/${productId}/sold`)).data;
}

export async function getFarmerProfile() {
  return (await api.get("/api/farmer/profile")).data;
}

export async function saveFarmerProfile(body: Record<string, any>) {
  return (await api.put("/api/farmer/profile", body)).data;
}

export async function getFarmerCooperatives(near?: string) {
  return (await api.get("/api/farmer/cooperatives", { params: cleanParams({ near }) })).data;
}

export async function getFarmerCooperative(id: string) {
  return (await api.get(`/api/farmer/cooperatives/${id}`)).data;
}
