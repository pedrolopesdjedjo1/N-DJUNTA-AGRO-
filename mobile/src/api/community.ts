import { api } from "./client";
import { cleanParams } from "./products";

// ---------- Eventos ----------
export async function listEvents(params: { kind?: string; area?: string; when?: string; q?: string } = {}) {
  return (await api.get("/api/events", { params: cleanParams(params) })).data;
}

export async function getMyEvents() {
  return (await api.get("/api/events/mine")).data;
}

export async function toggleEventRegistration(id: string) {
  return (await api.post(`/api/events/${id}/register`)).data;
}

export async function createEvent(body: Record<string, any>) {
  return (await api.post("/api/events", body)).data;
}

export async function deleteEvent(id: string) {
  return (await api.delete(`/api/events/${id}`)).data;
}

export async function getEventRegistrations(id: string) {
  return (await api.get(`/api/events/${id}/registrations`)).data;
}

// ---------- Aprender ----------
export async function listLearning(params: { area?: string; category?: string; q?: string } = {}) {
  return (await api.get("/api/learning", { params: cleanParams(params) })).data;
}

export async function createLearning(body: Record<string, any>) {
  return (await api.post("/api/learning", body)).data;
}

export async function deleteLearning(id: string) {
  return (await api.delete(`/api/learning/${id}`)).data;
}

// ---------- Comunidade ----------
export async function getMyCooperatives() {
  return (await api.get("/api/community/cooperatives")).data;
}

export async function listPosts(params: { kind?: string; cooperativeId?: string; q?: string; mine?: boolean } = {}) {
  return (await api.get("/api/community/posts", { params: cleanParams({ ...params, mine: params.mine ? "true" : "" }) })).data;
}

export async function createPost(body: Record<string, any>) {
  return (await api.post("/api/community/posts", body)).data;
}

export async function deletePost(id: string) {
  return (await api.delete(`/api/community/posts/${id}`)).data;
}
