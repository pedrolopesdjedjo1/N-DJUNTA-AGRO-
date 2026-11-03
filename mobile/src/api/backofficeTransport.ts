import { api } from "./client";

type Body = Record<string, any>;
const B = "/api/backoffice";

function params(obj: Body = {}) {
  const out: Body = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined || value === null || value === "" || value === false) return;
    out[key] = value === true ? "true" : value;
  });
  return out;
}

async function get(url: string, p?: Body) {
  return (await api.get(`${B}${url}`, { params: params(p) })).data;
}
async function post(url: string, body?: Body) {
  return (await api.post(`${B}${url}`, body ?? {})).data;
}
async function put(url: string, body?: Body) {
  return (await api.put(`${B}${url}`, body ?? {})).data;
}
async function del(url: string) {
  return (await api.delete(`${B}${url}`)).data;
}

export const getBoTransportCatalog = () => get("/catalog/transport");
export const getBoTransportExtra = () => get("/transport/v2/overview");

export const listBoServicePoints = (f: Body = {}) => get("/transport/services", f);
export const createBoServicePoint = (body: Body) => post("/transport/services", body);
export const updateBoServicePoint = (id: string, body: Body) => put(`/transport/services/${id}`, body);
export const reviewBoServicePoint = (id: string, body: Body) => post(`/transport/services/${id}/review`, body);
export const deleteBoServicePoint = (id: string) => del(`/transport/services/${id}`);

export const listBoIncidents = (f: Body = {}) => get("/transport/incidents", f);
export const getBoIncident = (id: string) => get(`/transport/incidents/${id}`);
export const handleBoIncident = (id: string, body: Body) => post(`/transport/incidents/${id}/handle`, body);

export const listBoPayouts = (f: Body = {}) => get("/transport/payouts", f);
export const resolveBoPayout = (id: string, body: Body) => post(`/transport/payouts/${id}/resolve`, body);
