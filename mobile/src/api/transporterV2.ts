import { api } from "./client";

type Body = Record<string, any>;
const T = "/api/transporter";
const P = "/api/platform";

// Tira os valores vazios e escreve os verdadeiros como "true"
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
  return (await api.get(url, { params: params(p) })).data;
}
async function post(url: string, body?: Body) {
  return (await api.post(url, body ?? {})).data;
}
async function put(url: string, body?: Body) {
  return (await api.put(url, body ?? {})).data;
}
async function patch(url: string, body?: Body) {
  return (await api.patch(url, body ?? {})).data;
}
async function del(url: string) {
  return (await api.delete(url)).data;
}

// ---------- Listas ----------
export const getTrCatalog = () => get(`${T}/catalog`);
export const getTrCatalogBusiness = () => get(`${T}/catalog/business`);
export const getTrCatalogTools = () => get(`${T}/catalog/tools`);

// ---------- Perfil e veículo ----------
export const getTrProfile = () => get(`${T}/profile`);
export const saveTrProfile = (body: Body) => put(`${T}/profile`, body);
export const setTrAvailability = (isAvailable: boolean) => put(`${T}/availability`, { isAvailable });
export const setTrVehicleStatus = (status: string, note?: string) => patch(`${T}/vehicle/status`, { status, note });

// ---------- Início, ganhos e reputação ----------
export const getTrHome = () => get(`${T}/home`);
export const getTrEarnings = () => get(`${T}/earnings`);
export const getTrReputation = () => get(`${T}/reputation`);
export const listTrToRate = () => get(`${T}/reputation/to-rate`);
export const rateTrParty = (deliveryId: string, body: Body) => post(`${T}/deliveries/${deliveryId}/rate`, body);
export const getTrPartyReputation = (userId: string) => get(`${T}/parties/${userId}/reputation`);
export const listTrComplaints = () => get(`${T}/complaints`);

// ---------- Entregas ----------
export const listTrAvailable = (f: Body = {}) => get(`${T}/deliveries/available`, f);
export const listTrMine = (f: Body = {}) => get(`${T}/deliveries/mine`, f);
export const getTrDelivery = (id: string) => get(`${T}/deliveries/${id}`);
export const acceptTrDelivery = (id: string) => post(`${T}/deliveries/${id}/accept`);
export const declineTrDelivery = (id: string) => post(`${T}/deliveries/${id}/decline`);
export const releaseTrDelivery = (id: string, body: Body) => post(`${T}/deliveries/${id}/release`, body);
export const collectTrDelivery = (id: string, body: Body = {}) => post(`${T}/deliveries/${id}/collect`, body);
export const startTrTrip = (id: string, body: Body = {}) => post(`${T}/deliveries/${id}/start`, body);
export const arriveTrDelivery = (id: string, body: Body = {}) => post(`${T}/deliveries/${id}/arrive`, body);
export const deliverTrDelivery = (id: string, body: Body) => post(`${T}/deliveries/${id}/deliver`, body);
export const shareTrLocation = (id: string, body: Body) => post(`${T}/deliveries/${id}/location`, body);
export const reportTrProblem = (id: string, body: Body) => post(`${T}/deliveries/${id}/problem`, body);
export const combineTrDeliveries = (id: string) => get(`${T}/deliveries/${id}/combine`);
export const getTrDeliveryRoute = (id: string, f: Body = {}) => get(`${T}/deliveries/${id}/route`, f);

// ---------- Mapa e rotas ----------
export const getTrMap = (f: Body = {}) => get(`${T}/map/v2`, f);
export const getTrRoutePlan = (f: Body = {}) => get(`${T}/route/plan`, f);

// ---------- Ferramentas e serviços ----------
export const listTrServices = (f: Body = {}) => get(`${T}/services`, f);
export const listMyTrServiceSuggestions = () => get(`${T}/services/mine`);
export const suggestTrService = (body: Body) => post(`${T}/services/suggest`, body);
export const getTrSafetyTips = () => get(`${T}/safety/tips`);

// ---------- Segurança e configurações ----------
export const getTrSecurity = () => get(`${T}/security`);
export const getTrSettings = () => get(`${T}/settings`);

// ---------- Emergência ----------
export const getTrEmergencyContacts = () => get(`${T}/emergency/contacts`);
export const saveTrEmergencyContacts = (contacts: { name: string; phone: string }[]) => put(`${T}/emergency/contacts`, { contacts });
export const createTrIncident = (body: Body) => post(`${T}/incidents`, body);
export const listTrIncidents = () => get(`${T}/incidents`);
export const getTrIncident = (id: string) => get(`${T}/incidents/${id}`);
export const resolveTrIncident = (id: string, message?: string) => post(`${T}/incidents/${id}/resolve`, { message });

// ---------- Pagamentos, despesas e relatório ----------
export const listTrPayments = (f: Body = {}) => get(`${T}/payments`, f);
export const confirmTrPayout = (id: string, body: Body) => post(`${T}/payments/${id}/confirm`, body);
export const contestTrPayout = (id: string, message: string) => post(`${T}/payments/${id}/contest`, { message });
export const listTrExpenses = (f: Body = {}) => get(`${T}/expenses`, f);
export const addTrExpense = (body: Body) => post(`${T}/expenses`, body);
export const deleteTrExpense = (id: string) => del(`${T}/expenses/${id}`);
export const getTrFinanceReport = (f: Body = {}) => get(`${T}/finance/report`, f);

// ---------- Contactos ----------
export const listTrContacts = (f: Body = {}) => get(`${T}/contacts`, f);
export const logTrContact = (body: Body) => post(`${T}/contacts/log`, body);
export const getTrContactHistory = (userId: string) => get(`${T}/contacts/${userId}/history`);
export const getTrDirectory = (f: Body = {}) => get(`${T}/directory`, f);

// ---------- Ofertas de transporte e pedidos ----------
export const listTrOffers = () => get(`${T}/offers`);
export const createTrOffer = (body: Body) => post(`${T}/offers`, body);
export const updateTrOffer = (id: string, body: Body) => put(`${T}/offers/${id}`, body);
export const closeTrOffer = (id: string) => post(`${T}/offers/${id}/close`);
export const listTrRequests = (f: Body = {}) => get(`${T}/requests`, f);
export const respondTrRequest = (id: string, body: Body) => post(`${T}/requests/${id}/respond`, body);

// ---------- Para todas as pessoas ----------
export const getDeliveryProof = (orderId: string) => get(`${P}/deliveries/${orderId}/proof`);
export const listPublicTransportOffers = (f: Body = {}) => get(`${P}/transport-offers`, f);
export const requestPublicTransport = (offerId: string, body: Body) => post(`${P}/transport-offers/${offerId}/requests`, body);
export const listMyTransportRequests = () => get(`${P}/transport-requests/mine`);
export const pingDevice = (body: Body) => post(`${P}/devices/ping`, body);
export const listDevices = (deviceId?: string) => get(`${P}/devices`, { deviceId });
export const removeDevice = (id: string) => del(`${P}/devices/${id}`);
