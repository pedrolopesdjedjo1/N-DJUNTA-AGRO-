import { api } from "./client";
import { cleanParams } from "./products";

export async function getForecast(region?: string) {
  return (await api.get("/api/weather/forecast", { params: cleanParams({ region }) })).data;
}

export async function getWeatherRegions(): Promise<string[]> {
  return (await api.get("/api/weather/regions")).data;
}
