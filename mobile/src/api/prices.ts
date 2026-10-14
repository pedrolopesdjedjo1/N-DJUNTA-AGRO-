import { api } from "./client";
import { cleanParams } from "./products";

export async function listPrices(params: { q?: string; department?: string; region?: string } = {}) {
  return (await api.get("/api/prices", { params: cleanParams(params) })).data;
}

export async function pricesByRegion(q: string) {
  return (await api.get("/api/prices/regions", { params: { q } })).data;
}

export async function comparePrices(q: string, region?: string) {
  return (await api.get("/api/prices/compare", { params: cleanParams({ q, region }) })).data;
}

export async function priceHistory(q: string, weeks = 12) {
  return (await api.get("/api/prices/history", { params: { q, weeks } })).data;
}

export async function priceMovers(department?: string) {
  return (await api.get("/api/prices/movers", { params: cleanParams({ department }) })).data;
}

export async function mostWanted(department?: string) {
  return (await api.get("/api/prices/most-wanted", { params: cleanParams({ department }) })).data;
}

export async function materialPrices(department?: string) {
  return (await api.get("/api/prices/materials", { params: cleanParams({ department }) })).data;
}

export async function listPriceAlerts() {
  return (await api.get("/api/prices/alerts")).data;
}

export async function checkPriceAlerts() {
  return (await api.get("/api/prices/alerts/check")).data;
}

export async function createPriceAlert(body: {
  productName: string;
  direction: "ACIMA" | "ABAIXO";
  targetPrice: number;
  region?: string;
}) {
  return (await api.post("/api/prices/alerts", body)).data;
}

export async function deletePriceAlert(id: string) {
  return (await api.delete(`/api/prices/alerts/${id}`)).data;
}
