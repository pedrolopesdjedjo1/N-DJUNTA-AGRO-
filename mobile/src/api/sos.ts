import { api } from "./client";
import { cleanParams } from "./products";

export async function createSos(body: { kind: string; message?: string; lat?: number; lng?: number; location?: string }) {
  return (await api.post("/api/sos", body)).data;
}

export async function getMySos() {
  return (await api.get("/api/sos/mine")).data;
}

export async function sendSosLocation(id: string, body: { lat?: number; lng?: number; location?: string }) {
  return (await api.post(`/api/sos/${id}/location`, body)).data;
}

export async function closeSos(id: string, status: "RESOLVIDO" | "CANCELADO") {
  return (await api.patch(`/api/sos/${id}/close`, { status })).data;
}

export async function getActiveSos(status?: string) {
  return (await api.get("/api/sos/active", { params: cleanParams({ status }) })).data;
}

export async function setSosStatus(id: string, status: "EM_RESGATE" | "RESOLVIDO" | "CANCELADO") {
  return (await api.patch(`/api/sos/${id}/status`, { status })).data;
}
