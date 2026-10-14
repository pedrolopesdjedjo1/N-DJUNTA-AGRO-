import { api } from "./client";
import { cleanParams } from "./products";

export async function nearbyTransporters(near?: string) {
  return (await api.get("/api/tracking/transporters", { params: cleanParams({ near }) })).data;
}

export async function getTracking(deliveryId: string) {
  return (await api.get(`/api/tracking/deliveries/${deliveryId}`)).data;
}

export async function sendLocation(
  deliveryId: string,
  body: { location?: string; lat?: number; lng?: number }
) {
  return (await api.post(`/api/tracking/deliveries/${deliveryId}/location`, body)).data;
}
