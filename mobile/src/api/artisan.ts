import { api } from "./client";
import { cleanParams } from "./products";

export async function getArtisanDashboard() {
  return (await api.get("/api/artisan/dashboard")).data;
}

export async function markProductSold(productId: string) {
  return (await api.post(`/api/artisan/products/${productId}/sold`)).data;
}

export async function getBestSelling() {
  return (await api.get("/api/artisan/best-selling")).data;
}

export async function getPayments() {
  return (await api.get("/api/artisan/payments")).data;
}

export async function getArtisanReviews() {
  return (await api.get("/api/artisan/reviews")).data;
}

export async function getArtisanProfile() {
  return (await api.get("/api/artisan/profile")).data;
}

export async function saveArtisanProfile(body: Record<string, any>) {
  return (await api.put("/api/artisan/profile", body)).data;
}

export async function getMarket() {
  return (await api.get("/api/artisan/market")).data;
}

export async function compareMarket(params: { q?: string; subcategory?: string }) {
  return (await api.get("/api/artisan/market/compare", { params: cleanParams(params) })).data;
}
