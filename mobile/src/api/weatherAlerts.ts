import { api } from "./client";

export async function getWeatherAlerts() {
  const response = await api.get("/api/weather-alerts");
  return response.data.alerts || response.data.weatherAlerts || response.data || [];
}
