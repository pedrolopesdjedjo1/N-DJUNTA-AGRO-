import { api } from "./client";
import { cleanParams } from "./products";

export async function listContacts(params: { kind?: string; region?: string; q?: string } = {}) {
  return (await api.get("/api/contacts", { params: cleanParams(params) })).data;
}

export async function createContact(body: Record<string, any>) {
  return (await api.post("/api/contacts", body)).data;
}

export async function deleteContact(id: string) {
  return (await api.delete(`/api/contacts/${id}`)).data;
}
