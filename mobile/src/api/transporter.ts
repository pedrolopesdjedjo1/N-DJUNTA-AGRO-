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
const T = "/api/transporter";

async function get(url: string, p?: Body) {
  return (await api.get(`${T}${url}`, { params: params(p) })).data;
}
async function post(url: string, body?: Body) {
  return (await api.post(`${T}${url}`, body ?? {})).data;
}
async function put(url: string, body?: Body) {
  return (await api.put(`${T}${url}`, body ?? {})).data;
}
async function patch(url: string, body?: Body) {
  return (await api.patch(`${T}${url}`, body ?? {})).data;
}
async function remove(url: string) {
  return (await api.delete(`${T}${url}`)).data;
}

// ---------- Base ----------
export const getTransportCatalog = () => get("/catalog");
export const getTransporterHome = () => get("/home");
export const getTransporterEarnings = () => get("/earnings");
export const getTransporterRatings = () => get("/ratings");

// ---------- Perfil e veículo ----------
export const getTransporterProfile = () => get("/profile");
export const saveTransporterProfile = (body: Body) => put("/profile", body);
export const setTransporterAvailability = (isAvailable: boolean) => patch("/availability", { isAvailable });
export const addTransporterDocument = (body: Body) => post("/profile/documents", body);
export const deleteTransporterDocument = (id: string) => remove(`/profile/documents/${id}`);
export const submitTransporterVerification = () => post("/profile/submit");
export const getPublicTransporter = (id: string) => get(`/public/${id}`);

// ---------- Entregas ----------
export const listAvailableDeliveries = (f: Body = {}) => get("/deliveries/available", f);
export const listMyDeliveries = (f: Body = {}) => get("/deliveries/mine", f);
export const getTransporterDelivery = (id: string) => get(`/deliveries/${id}`);
export const acceptDelivery = (id: string) => post(`/deliveries/${id}/accept`);
export const declineDelivery = (id: string) => post(`/deliveries/${id}/decline`);
export const releaseDelivery = (id: string, body: Body) => post(`/deliveries/${id}/release`, body);
export const collectDelivery = (id: string, body: Body = {}) => post(`/deliveries/${id}/collect`, body);
export const deliverDelivery = (id: string, body: Body = {}) => post(`/deliveries/${id}/deliver`, body);
export const shareDeliveryLocation = (id: string, body: Body) => post(`/deliveries/${id}/location`, body);
export const reportDeliveryProblem = (id: string, body: Body) => post(`/deliveries/${id}/problem`, body);

// ---------- Mapa, ganhos e relatório ----------
export const getTransporterMap = (f: Body = {}) => get("/map", f);
export const listTransporterEarnings = (f: Body = {}) => get("/earnings/history", f);
export const getTransporterReport = (f: Body = {}) => get("/report", f);

// ---------- Equipa do app ----------
export const adminListTransporters = (f: Body = {}) => get("/admin/transporters", f);
export const adminReviewTransporter = (userId: string, body: Body) => post(`/admin/transporters/${userId}/review`, body);
