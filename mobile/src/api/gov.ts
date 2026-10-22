import { api } from "./client";

// Tira os valores vazios e escreve os verdadeiros como "true"
function params(obj: Record<string, any> = {}) {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined || value === null || value === "" || value === false) return;
    out[key] = value === true ? "true" : value;
  });
  return out;
}

type Body = Record<string, any>;

// ---------- Base ----------
export async function getGovCatalog() {
  return (await api.get("/api/gov/catalog")).data;
}

export async function getGovRegions(): Promise<{ key: string; name: string; lat: number; lng: number }[]> {
  return (await api.get("/api/gov/regions")).data;
}

export async function getGovHome() {
  return (await api.get("/api/gov/home")).data;
}

export async function getGovStats(filters: { region?: string; months?: number } = {}) {
  return (await api.get("/api/gov/stats", { params: params(filters) })).data;
}

export async function getGovMap(filters: { layers?: string } = {}) {
  return (await api.get("/api/gov/map", { params: params(filters) })).data;
}

export async function listInstitutions(filters: { q?: string; region?: string; area?: string; verified?: boolean } = {}) {
  return (await api.get("/api/gov/institutions", { params: params(filters) })).data;
}

// ---------- Programas ----------
export async function listPrograms(filters: { status?: string; area?: string; q?: string } = {}) {
  return (await api.get("/api/gov/programs", { params: params(filters) })).data;
}

export async function getProgram(id: string) {
  return (await api.get(`/api/gov/programs/${id}`)).data;
}

export async function createProgram(body: Body) {
  return (await api.post("/api/gov/programs", body)).data;
}

export async function updateProgram(id: string, body: Body) {
  return (await api.put(`/api/gov/programs/${id}`, body)).data;
}

export async function deleteProgram(id: string) {
  return (await api.delete(`/api/gov/programs/${id}`)).data;
}

export async function linkProgramProject(id: string, projectId: string) {
  return (await api.post(`/api/gov/programs/${id}/projects`, { projectId })).data;
}

export async function unlinkProgramProject(id: string, projectId: string) {
  return (await api.delete(`/api/gov/programs/${id}/projects/${projectId}`)).data;
}

export async function listPublicPrograms(filters: { area?: string; region?: string; q?: string; status?: string } = {}) {
  return (await api.get("/api/gov/public-programs", { params: params(filters) })).data;
}

export async function getPublicProgram(id: string) {
  return (await api.get(`/api/gov/public-programs/${id}`)).data;
}

// ---------- Serviços públicos ----------
export async function listServices(
  filters: { category?: string; region?: string; q?: string; status?: string; ownerId?: string } = {}
) {
  return (await api.get("/api/gov/services", { params: params(filters) })).data;
}

export async function getService(id: string) {
  return (await api.get(`/api/gov/services/${id}`)).data;
}

export async function getMyServices() {
  return (await api.get("/api/gov/services/mine")).data;
}

export async function createService(body: Body) {
  return (await api.post("/api/gov/services", body)).data;
}

export async function updateService(id: string, body: Body) {
  return (await api.put(`/api/gov/services/${id}`, body)).data;
}

export async function setServiceStatus(id: string, body: { status: string; note?: string }) {
  return (await api.patch(`/api/gov/services/${id}/status`, body)).data;
}

export async function deleteService(id: string) {
  return (await api.delete(`/api/gov/services/${id}`)).data;
}

// ---------- Locais: infraestruturas, mercados e zonas de produção ----------
export async function listPlaces(
  filters: { kind?: string; subtype?: string; region?: string; status?: string; q?: string; mine?: boolean } = {}
) {
  return (await api.get("/api/gov/places", { params: params(filters) })).data;
}

export async function getPlace(id: string) {
  return (await api.get(`/api/gov/places/${id}`)).data;
}

export async function createPlace(body: Body) {
  return (await api.post("/api/gov/places", body)).data;
}

export async function updatePlace(id: string, body: Body) {
  return (await api.put(`/api/gov/places/${id}`, body)).data;
}

export async function setPlaceStatus(id: string, status: string) {
  return (await api.patch(`/api/gov/places/${id}/status`, { status })).data;
}

export async function deletePlace(id: string) {
  return (await api.delete(`/api/gov/places/${id}`)).data;
}

// ---------- Pedidos e denúncias: cidadãos ----------
export async function createReport(body: Body) {
  return (await api.post("/api/gov/reports", body)).data;
}

export async function getMyReports() {
  return (await api.get("/api/gov/my-reports")).data;
}

export async function getMyReport(id: string) {
  return (await api.get(`/api/gov/my-reports/${id}`)).data;
}

export async function commentMyReport(id: string, message: string) {
  return (await api.post(`/api/gov/my-reports/${id}/comment`, { message })).data;
}

export async function deleteMyReport(id: string) {
  return (await api.delete(`/api/gov/my-reports/${id}`)).data;
}

export async function trackProtocol(protocol: string) {
  return (await api.get(`/api/gov/track/${encodeURIComponent(protocol)}`)).data;
}

// ---------- Pedidos e denúncias: instituições ----------
export async function listReports(
  filters: { scope?: string; status?: string; category?: string; region?: string; priority?: string; q?: string } = {}
) {
  return (await api.get("/api/gov/reports", { params: params(filters) })).data;
}

export async function getReport(id: string) {
  return (await api.get(`/api/gov/reports/${id}`)).data;
}

export async function setReportStatus(id: string, body: { status: string; answer?: string }) {
  return (await api.patch(`/api/gov/reports/${id}/status`, body)).data;
}

export async function respondReport(id: string, message: string) {
  return (await api.post(`/api/gov/reports/${id}/respond`, { message })).data;
}

export async function noteReport(id: string, message: string) {
  return (await api.post(`/api/gov/reports/${id}/note`, { message })).data;
}

export async function setReportPriority(id: string, priority: "NORMAL" | "URGENTE") {
  return (await api.patch(`/api/gov/reports/${id}/priority`, { priority })).data;
}

export async function forwardReport(id: string, body: { institutionId: string; message?: string }) {
  return (await api.post(`/api/gov/reports/${id}/forward`, body)).data;
}

// ---------- Alertas oficiais ----------
export async function listAlerts(filters: { region?: string; kind?: string; severity?: string; all?: boolean } = {}) {
  return (await api.get("/api/gov/alerts", { params: params(filters) })).data;
}

export async function getMyAlerts() {
  return (await api.get("/api/gov/alerts/mine")).data;
}

export async function getAlert(id: string) {
  return (await api.get(`/api/gov/alerts/${id}`)).data;
}

export async function createAlert(body: Body) {
  return (await api.post("/api/gov/alerts", body)).data;
}

export async function updateAlert(id: string, body: Body) {
  return (await api.put(`/api/gov/alerts/${id}`, body)).data;
}

export async function endAlert(id: string, notifyEnd = false) {
  return (await api.post(`/api/gov/alerts/${id}/end`, { notifyEnd })).data;
}

export async function deleteAlert(id: string) {
  return (await api.delete(`/api/gov/alerts/${id}`)).data;
}
