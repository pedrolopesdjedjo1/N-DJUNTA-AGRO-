import { api } from "./client";
import { cleanParams } from "./products";

export async function createOrder(body: {
  items: { productId: string; quantity: number }[];
  deliveryOption?: string;
  deliveryAddress?: string;
  notes?: string;
}) {
  return (await api.post("/api/orders", body)).data;
}

export async function getOrders(as: "seller" | "buyer" = "seller", status?: string) {
  return (await api.get("/api/orders", { params: cleanParams({ as, status }) })).data;
}

export async function getOrder(id: string) {
  return (await api.get(`/api/orders/${id}`)).data;
}

export async function setOrderStatus(id: string, status: string) {
  return (await api.patch(`/api/orders/${id}/status`, { status })).data;
}

export async function setOrderPaid(id: string, paid: boolean) {
  return (await api.patch(`/api/orders/${id}/paid`, { paid })).data;
}

export async function getTransporters() {
  return (await api.get("/api/orders/transporters")).data;
}

export async function requestDelivery(
  orderId: string,
  body: { transporterId: string; offerId?: string; price?: number; pickupAt?: string }
) {
  return (await api.post(`/api/orders/${orderId}/delivery`, body)).data;
}

export async function getDeliveries() {
  return (await api.get("/api/orders/deliveries")).data;
}

export async function setDeliveryStatus(deliveryId: string, status: string) {
  return (await api.patch(`/api/orders/deliveries/${deliveryId}/status`, { status })).data;
}
