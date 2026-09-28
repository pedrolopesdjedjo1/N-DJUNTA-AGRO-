import { api } from "./client";

export async function getMarketPrices() {
  const response = await api.get("/api/market-prices");
  return response.data.prices || response.data.marketPrices || response.data || [];
}
