import { api } from "./client";
import { cleanParams } from "./products";

export async function getDashboard() {
  return (await api.get("/api/merchant/dashboard")).data;
}

export async function getMyStore() {
  return (await api.get("/api/merchant/store")).data;
}

export async function saveStore(body: Record<string, any>) {
  return (await api.put("/api/merchant/store", body)).data;
}

export async function getPublicStore(ownerId: string) {
  return (await api.get(`/api/merchant/stores/${ownerId}`)).data;
}

export async function getMyProducts(params: { q?: string; department?: string } = {}) {
  return (await api.get("/api/merchant/products", { params: cleanParams(params) })).data;
}

export async function getSales() {
  return (await api.get("/api/merchant/sales")).data;
}

export async function getCustomers() {
  return (await api.get("/api/merchant/customers")).data;
}

export async function getCustomerHistory(customerId: string) {
  return (await api.get(`/api/merchant/customers/${customerId}/history`)).data;
}

export async function toggleFavoriteCustomer(customerId: string) {
  return (await api.post(`/api/merchant/customers/${customerId}/favorite`)).data;
}

export async function getPromotions() {
  return (await api.get("/api/merchant/promotions")).data;
}

export async function createPromotion(body: Record<string, any>) {
  return (await api.post("/api/merchant/promotions", body)).data;
}

export async function deletePromotion(id: string) {
  return (await api.delete(`/api/merchant/promotions/${id}`)).data;
}
