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
const A = "/api/agent";

async function get(url: string, p?: Body) {
  return (await api.get(`${A}${url}`, { params: params(p) })).data;
}
async function post(url: string, body?: Body) {
  return (await api.post(`${A}${url}`, body ?? {})).data;
}
async function put(url: string, body?: Body) {
  return (await api.put(`${A}${url}`, body ?? {})).data;
}
async function patch(url: string, body?: Body) {
  return (await api.patch(`${A}${url}`, body ?? {})).data;
}
async function remove(url: string) {
  return (await api.delete(`${A}${url}`)).data;
}

// ---------- Catálogos ----------
export const getAgentCatalog = () => get("/catalog");
export const getAgentOpsCatalog = () => get("/ops-catalog");
export const getAgentFinanceCatalog = () => get("/finance-catalog");

// ---------- O meu perfil ----------
export const getMyAgentProfile = () => get("/me");
export const saveMyAgentProfile = (body: Body) => put("/me", body);
export const addAgentDocument = (body: Body) => post("/me/documents", body);
export const deleteAgentDocument = (id: string) => remove(`/me/documents/${id}`);
export const submitAgentProfile = () => post("/me/submit");
export const getPublicAgent = (id: string) => get(`/public/${id}`);

// ---------- Clientes ----------
export const listAgentClients = (f: Body = {}) => get("/clients", f);
export const getAgentClient = (id: string) => get(`/clients/${id}`);
export const linkRegisteredClient = (body: Body) => post("/clients/register-link", body);
export const inviteClient = (body: Body) => post("/clients/invite", body);
export const updateClientNotes = (id: string, notes: string) => patch(`/clients/${id}/notes`, { notes });
export const removeAgentClient = (id: string) => remove(`/clients/${id}`);
export const addClientActivity = (id: string, body: Body) => post(`/clients/${id}/activities`, body);
export const listAgentActivities = (f: Body = {}) => get("/activities", f);

// ---------- Sessões de ajuda ----------
export const startAssist = (linkId: string, reason: string) => post(`/clients/${linkId}/assist`, { reason });
export const renewAssist = (sessionId: string) => post(`/assist/${sessionId}/renew`);
export const endAssist = (sessionId: string) => post(`/assist/${sessionId}/end`);
export const listAssistSessions = (f: Body = {}) => get("/assist/sessions", f);

// ---------- Do lado da pessoa ajudada ----------
export const getMyAgents = () => get("/my-agents");
export const respondAgentInvite = (linkId: string, accept: boolean) => post(`/my-agents/${linkId}/respond`, { accept });
export const revokeMyAgent = (linkId: string) => remove(`/my-agents/${linkId}`);
export const getMyAgentActivity = (linkId: string) => get(`/my-agents/${linkId}/activity`);
export const rateMyAgent = (linkId: string, body: Body) => post(`/my-agents/${linkId}/rate`, body);

// ---------- Início ----------
export const getAgentHome = () => get("/home");

// ---------- Tarefas ----------
export const listAgentTasks = (f: Body = {}) => get("/tasks", f);
export const createAgentTask = (body: Body) => post("/tasks", body);
export const updateAgentTask = (id: string, body: Body) => put(`/tasks/${id}`, body);
export const setAgentTaskStatus = (id: string, done: boolean) => patch(`/tasks/${id}/status`, { done });
export const deleteAgentTask = (id: string) => remove(`/tasks/${id}`);

// ---------- Necessidades ----------
export const listAgentNeeds = (f: Body = {}) => get("/needs", f);
export const createAgentNeed = (body: Body) => post("/needs", body);
export const updateAgentNeed = (id: string, body: Body) => put(`/needs/${id}`, body);
export const setAgentNeedServed = (id: string, served: boolean) => patch(`/needs/${id}/status`, { served });
export const forwardAgentNeed = (id: string, body: Body = {}) => post(`/needs/${id}/forward`, body);
export const deleteAgentNeed = (id: string) => remove(`/needs/${id}`);

// ---------- Produtores e comunidades ----------
export const listAgentProducers = (f: Body = {}) => get("/producers", f);
export const inviteProducer = (userId: string, notes?: string) => post(`/producers/${userId}/invite`, { notes });
export const listAgentCooperatives = (f: Body = {}) => get("/cooperatives", f);
export const getAgentCommunities = (f: Body = {}) => get("/communities", f);

// ---------- Oportunidades ----------
export const listAgentOpportunities = (f: Body = {}) => get("/opportunities", f);
export const referToClients = (body: Body) => post("/referrals", body);
export const listAgentReferrals = () => get("/referrals");

// ---------- Mercado ----------
export const listAgentMarket = (f: Body = {}) => get("/market", f);
export const getAgentProduct = (id: string) => get(`/market/${id}`);
export const getClientProducts = (linkId: string) => get(`/market/clients/${linkId}`);
export const suggestProduct = (body: Body) => post("/market/suggest", body);

// ---------- Encomendas ----------
export const listAgentOrders = (f: Body = {}) => get("/orders", f);
export const getAgentOrder = (id: string) => get(`/orders/${id}`);
export const logOrderAction = (id: string, body: Body) => post(`/orders/${id}/log`, body);

// ---------- Transporte ----------
export const listAgentTransporters = (f: Body = {}) => get("/transporters", f);
export const listAgentDeliveries = (f: Body = {}) => get("/deliveries", f);
export const getAgentDelivery = (id: string) => get(`/deliveries/${id}`);

// ---------- Chamados ----------
export const listAgentCases = (f: Body = {}) => get("/cases", f);
export const createAgentCase = (body: Body) => post("/cases", body);
export const getAgentCase = (id: string) => get(`/cases/${id}`);
export const addAgentCaseNote = (id: string, message: string) => post(`/cases/${id}/notes`, { message });
export const setAgentCaseStatus = (id: string, body: Body) => patch(`/cases/${id}/status`, body);
export const escalateAgentCase = (id: string, message: string) => post(`/cases/${id}/escalate`, { message });
export const deleteAgentCase = (id: string) => remove(`/cases/${id}`);

// ---------- Ganhos, relatório e mapa ----------
export const getAgentEarnings = () => get("/earnings");
export const listAgentCommissions = (f: Body = {}) => get("/commissions", f);
export const listAgentPayments = (f: Body = {}) => get("/payments", f);
export const getAgentReport = (f: Body = {}) => get("/report", f);
export const getAgentMap = (f: Body = {}) => get("/map", f);

// ---------- Segurança ----------
export const getAgentSecurity = () => get("/security");
export const lockAgentAccount = (reason?: string) => post("/security/lock", { reason });
export const createSecurityReport = (body: Body) => post("/security-reports", body);
export const listMySecurityReports = () => get("/security-reports");

// ---------- Equipa do app ----------
export const adminListAgents = (f: Body = {}) => get("/admin/agents", f);
export const adminReviewAgent = (userId: string, body: Body) => post(`/admin/agents/${userId}/review`, body);
export const adminAgentDetail = (userId: string) => get(`/admin/agents/${userId}/detail`);
export const adminReconcileAgent = (userId: string) => post(`/admin/agents/${userId}/reconcile`);
export const adminUnlockAgent = (userId: string, note?: string) => post(`/admin/agents/${userId}/unlock`, { note });
export const adminAgentSignals = () => get("/admin/signals");
export const adminListSecurityReports = (f: Body = {}) => get("/admin/security-reports", f);
export const adminRespondSecurityReport = (id: string, body: Body) => post(`/admin/security-reports/${id}/respond`, body);
export const adminCommissionsOverview = (f: Body = {}) => get("/admin/commissions", f);
export const adminListCommissionRows = (f: Body = {}) => get("/admin/commissions/list", f);
export const adminPayCommissions = (body: Body) => post("/admin/commissions/pay", body);
export const adminVoidCommission = (id: string, note: string) => post(`/admin/commissions/${id}/void`, { note });
export const adminListAgentCases = (f: Body = {}) => get("/admin/cases", f);
export const adminGetAgentCase = (id: string) => get(`/admin/cases/${id}`);
export const adminRespondAgentCase = (id: string, body: Body) => post(`/admin/cases/${id}/respond`, body);
