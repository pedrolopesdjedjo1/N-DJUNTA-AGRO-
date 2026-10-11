import { api } from "./client";
import { cleanParams } from "./products";

export async function getSettings() {
  return (await api.get("/api/settings")).data;
}

export async function updateSettings(body: Record<string, any>) {
  return (await api.put("/api/settings", body)).data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return (await api.patch("/api/settings/password", { currentPassword, newPassword })).data;
}

export async function changePhone(phone: string, password: string) {
  return (await api.patch("/api/settings/phone", { phone, password })).data;
}

export async function createTicket(body: { kind: string; subject: string; message: string; orderId?: string }) {
  return (await api.post("/api/support/tickets", body)).data;
}

export async function getMyTickets() {
  return (await api.get("/api/support/tickets")).data;
}

export async function getAllTickets(status?: string) {
  return (await api.get("/api/support/tickets/all", { params: cleanParams({ status }) })).data;
}

export async function setTicketStatus(id: string, status: string) {
  return (await api.patch(`/api/support/tickets/${id}/status`, { status })).data;
}
