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
const B = "/api/backoffice";

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

// ---------- Listas ----------
export const getBoCatalogCore = () => get("/catalog");
export const getBoCatalogUsers = () => get("/catalog/users");
export const getBoCatalogOps = () => get("/catalog/ops");
export const getBoCatalogFinance = () => get("/catalog/finance");
export const getBoCatalogOrgs = () => get("/catalog/orgs");
export const getBoCatalogContent = () => get("/catalog/content");

// ---------- Acesso, sessão e segurança ----------
export const getBoMe = () => get("/me");
export const boSessionStart = (code?: string) => post("/session/start", { code });
export const getBoSessionStatus = () => get("/session/status");
export const boSessionEnd = () => post("/session/end");
export const getBoSecurity = () => get("/security/me");
export const boTwoFactorSetup = () => post("/security/2fa/setup");
export const boTwoFactorEnable = (code: string) => post("/security/2fa/enable", { code });
export const boTwoFactorDisable = (code: string) => post("/security/2fa/disable", { code });
export const listBoSessions = () => get("/security/sessions");
export const revokeBoSession = (id: string) => del(`/security/sessions/${id}`);
export const revokeBoSessionsOf = (userId: string) => del(`/security/sessions-of/${userId}`);
export const unlockBoAdmin = (userId: string) => post(`/security/unlock/${userId}`);
export const resetBoTwoFactor = (userId: string) => post(`/security/reset-2fa/${userId}`);
export const listBoSecurityEvents = (f: Body = {}) => get("/security/events", f);
export const listBoAudit = (f: Body = {}) => get("/audit", f);

// ---------- Equipa ----------
export const listBoTeam = (f: Body = {}) => get("/team", f);
export const getBoTeamMember = (userId: string) => get(`/team/${userId}`);
export const promoteBoAdmin = (body: Body) => post("/team/promote", body);
export const updateBoAdmin = (userId: string, body: Body) => put(`/team/${userId}`, body);
export const suspendBoAdmin = (userId: string, note: string) => post(`/team/${userId}/suspend`, { note });
export const reactivateBoAdmin = (userId: string) => post(`/team/${userId}/reactivate`);
export const demoteBoAdmin = (userId: string, role?: string) => post(`/team/${userId}/demote`, { role });

// ---------- Configurações ----------
export const listBoSettings = () => get("/settings");
export const updateBoSetting = (key: string, value: any) => put(`/settings/${key}`, { value });

// ---------- Painel ----------
export const getBoDashboard = () => get("/dashboard");

// ---------- Utilizadores e perfis ----------
export const listBoUsers = (f: Body = {}) => get("/users", f);
export const getBoUser = (id: string) => get(`/users/${id}`);
export const editBoUser = (id: string, body: Body) => put(`/users/${id}`, body);
export const suspendBoUser = (id: string, body: Body) => post(`/users/${id}/suspend`, body);
export const blockBoUser = (id: string, body: Body) => post(`/users/${id}/block`, body);
export const reactivateBoUser = (id: string, body: Body) => post(`/users/${id}/reactivate`, body);
export const verifyBoUser = (id: string, note?: string) => post(`/users/${id}/verify`, { note });
export const unverifyBoUser = (id: string, note: string) => post(`/users/${id}/unverify`, { note });
export const getBoProfilesSummary = () => get("/profiles/summary");
export const listBoProfiles = (kind: string, f: Body = {}) => get(`/profiles/${kind}`, f);
export const listBoIdentity = (f: Body = {}) => get("/identity", f);
export const getBoIdentity = (id: string) => get(`/identity/${id}`);
export const reviewBoIdentity = (id: string, body: Body) => post(`/identity/${id}/review`, body);

// ---------- Denúncias ----------
export const listBoReports = (f: Body = {}) => get("/reports", f);
export const getBoReport = (id: string) => get(`/reports/${id}`);
export const assignBoReport = (id: string) => post(`/reports/${id}/assign`);
export const noteBoReport = (id: string, message: string) => post(`/reports/${id}/note`, { message });
export const decideBoReport = (id: string, body: Body) => post(`/reports/${id}/decide`, body);

// ---------- Mercado ----------
export const listBoProducts = (f: Body = {}) => get("/market/products", f);
export const getBoProduct = (id: string) => get(`/market/products/${id}`);
export const approveBoProduct = (id: string, note?: string) => post(`/market/products/${id}/approve`, { note });
export const bulkApproveBoProducts = (ids: string[]) => post("/market/products/bulk-approve", { ids });
export const rejectBoProduct = (id: string, body: Body) => post(`/market/products/${id}/reject`, body);
export const removeBoProduct = (id: string, body: Body) => post(`/market/products/${id}/remove`, body);
export const restoreBoProduct = (id: string, note: string) => post(`/market/products/${id}/restore`, { note });
export const flagBoProductQuality = (id: string, body: Body) => post(`/market/products/${id}/quality`, body);
export const featureBoProduct = (id: string, days: number) => post(`/market/products/${id}/feature`, { days });
export const unfeatureBoProduct = (id: string) => post(`/market/products/${id}/unfeature`);
export const listBoFeatured = () => get("/market/featured");
export const listBoQuality = (f: Body = {}) => get("/market/quality", f);
export const getBoCategories = () => get("/market/categories");
export const saveBoCategory = (department: string, body: Body) => put(`/market/categories/${department}`, body);

// ---------- Encomendas e disputas ----------
export const listBoOrders = (f: Body = {}) => get("/orders", f);
export const getBoOrder = (id: string) => get(`/orders/${id}`);
export const noteBoOrder = (id: string, message: string) => post(`/orders/${id}/note`, { message });
export const notifyBoOrder = (id: string, body: Body) => post(`/orders/${id}/notify`, body);
export const listBoDisputes = (f: Body = {}) => get("/disputes", f);
export const getBoDispute = (id: string) => get(`/disputes/${id}`);
export const assignBoDispute = (id: string) => post(`/disputes/${id}/assign`);
export const noteBoDispute = (id: string, message: string) => post(`/disputes/${id}/note`, { message });
export const messageBoDispute = (id: string, message: string) => post(`/disputes/${id}/message`, { message });
export const resolveBoDispute = (id: string, body: Body) => post(`/disputes/${id}/resolve`, body);

// ---------- Transportes ----------
export const getBoTransportOverview = () => get("/transport/overview");
export const listBoTransporters = (f: Body = {}) => get("/transport/transporters", f);
export const warnBoTransporter = (userId: string, message: string) => post(`/transport/transporters/${userId}/warn`, { message });
export const listBoDeliveries = (f: Body = {}) => get("/transport/deliveries", f);
export const getBoDelivery = (id: string) => get(`/transport/deliveries/${id}`);
export const handleBoDelivery = (id: string, body: Body) => post(`/transport/deliveries/${id}/handle`, body);
export const getBoRoutes = () => get("/transport/routes");
export const listBoDeliveryProblems = (f: Body = {}) => get("/transport/problems", f);
export const listBoComplaints = (f: Body = {}) => get("/transport/complaints", f);
export const getBoTransportRatings = () => get("/transport/ratings");
export const listBoTransportVerification = (f: Body = {}) => get("/transport/verification", f);
export const reviewBoTransportVerification = (userId: string, body: Body) => post(`/transport/verification/${userId}/review`, body);

// ---------- Financeiro ----------
export const getBoFinanceOverview = () => get("/finance/overview");
export const getBoSales = (f: Body = {}) => get("/finance/sales", f);
export const listBoPayments = (f: Body = {}) => get("/finance/payments", f);
export const listBoTransactions = (f: Body = {}) => get("/finance/transactions", f);
export const getBoFinanceReport = (f: Body = {}) => get("/finance/report", f);
export const listBoCommissions = (f: Body = {}) => get("/finance/commissions", f);
export const getBoCommissionRows = (agentId: string) => get(`/finance/commissions/${agentId}`);
export const payBoCommissions = (agentId: string, note?: string) => post("/finance/commissions/pay", { agentId, note });
export const voidBoCommission = (id: string, note: string) => post(`/finance/commissions/${id}/void`, { note });
export const listBoRefunds = (f: Body = {}) => get("/finance/refunds", f);
export const listBoRefundCandidates = () => get("/finance/refunds/candidates");
export const createBoRefund = (body: Body) => post("/finance/refunds", body);
export const getBoRefund = (id: string) => get(`/finance/refunds/${id}`);
export const decideBoRefund = (id: string, body: Body) => post(`/finance/refunds/${id}/decide`, body);
export const payBoRefund = (id: string, note: string) => post(`/finance/refunds/${id}/pay`, { note });
export const listBoFlags = (f: Body = {}) => get("/finance/flags", f);
export const reviewBoFlag = (key: string, note: string) => post("/finance/flags/review", { key, note });

// ---------- Cooperativas, organizações e governo ----------
export const listBoCoops = (f: Body = {}) => get("/coops", f);
export const getBoCoop = (id: string) => get(`/coops/${id}`);
export const editBoCoop = (id: string, body: Body) => put(`/coops/${id}`, body);
export const reviewBoCoop = (id: string, body: Body) => post(`/coops/${id}/review`, body);
export const listBoOrgs = (f: Body = {}) => get("/orgs", f);
export const getBoOrg = (userId: string) => get(`/orgs/${userId}`);
export const suspendBoOrg = (userId: string, body: Body) => post(`/orgs/${userId}/suspend`, body);
export const reactivateBoOrg = (userId: string, body: Body) => post(`/orgs/${userId}/reactivate`, body);
export const notifyBoOrg = (userId: string, message: string) => post(`/orgs/${userId}/notify`, { message });
export const hideBoOrgContent = (body: Body) => post("/content/hide", body);
export const restoreBoOrgContent = (body: Body) => post("/content/restore", body);
export const getBoGovOverview = () => get("/gov/overview");
export const listBoGovPrograms = (f: Body = {}) => get("/gov/programs", f);
export const listBoGovServices = (f: Body = {}) => get("/gov/services", f);
export const setBoGovServicePublished = (id: string, published: boolean, note?: string) => post(`/gov/services/${id}/published`, { published, note });
export const listBoGovPublications = (f: Body = {}) => get("/gov/publications", f);
export const listBoGovRequests = (f: Body = {}) => get("/gov/requests", f);

// ---------- Avisos e alertas ----------
export const previewBoBroadcast = (body: Body) => post("/broadcasts/preview", body);
export const sendBoBroadcast = (body: Body) => post("/broadcasts", body);
export const listBoBroadcasts = (f: Body = {}) => get("/broadcasts", f);
export const getBoAlerts = (f: Body = {}) => get("/alerts", f);
export const endBoAlert = (id: string, notify?: boolean) => post(`/alerts/${id}/end`, { notify });
export const endBoOfficialAlert = (id: string) => post(`/alerts/official/${id}/end`);

// ---------- Conteúdo ----------
export const listBoBanners = (f: Body = {}) => get("/banners", f);
export const createBoBanner = (body: Body) => post("/banners", body);
export const updateBoBanner = (id: string, body: Body) => put(`/banners/${id}`, body);
export const deleteBoBanner = (id: string) => del(`/banners/${id}`);
export const listBoHighlights = (f: Body = {}) => get("/highlights", f);
export const saveBoHighlight = (body: Body) => post("/highlights", body);
export const removeBoHighlight = (id: string) => del(`/highlights/${id}`);
export const listBoContent = (kind: string, f: Body = {}) => get(`/content/list/${kind}`, f);
export const hideBoContent = (body: Body) => post("/content/visibility/hide", body);
export const restoreBoContent = (body: Body) => post("/content/visibility/restore", body);
export const listBoEvents = (f: Body = {}) => get("/events", f);
export const getBoEvent = (id: string) => get(`/events/${id}`);
export const cancelBoEvent = (id: string, reason: string) => post(`/events/${id}/cancel`, { reason });
export const restoreBoEvent = (id: string, reason: string) => post(`/events/${id}/restore`, { reason });
export const notifyBoEvent = (id: string, message: string) => post(`/events/${id}/notify`, { message });

// ---------- Suporte ----------
export const listBoTickets = (f: Body = {}) => get("/support/tickets", f);
export const getBoTicket = (id: string) => get(`/support/tickets/${id}`);
export const replyBoTicket = (id: string, body: Body) => post(`/support/tickets/${id}/reply`, body);
export const noteBoTicket = (id: string, message: string) => post(`/support/tickets/${id}/note`, { message });
export const setBoTicketStatus = (id: string, status: string) => post(`/support/tickets/${id}/status`, { status });
export const assignBoTicket = (id: string) => post(`/support/tickets/${id}/assign`);
export const getBoSupportStats = () => get("/support/stats");
export const getBoSupportContacts = () => get("/support/contacts");

// ---------- Relatórios e estatísticas ----------
export const getBoStatsOverview = (f: Body = {}) => get("/stats/overview", f);
export const getBoStatsGrowth = (f: Body = {}) => get("/stats/growth", f);
export const getBoStatsRegions = (f: Body = {}) => get("/stats/regions", f);
export const getBoStatsSegment = (kind: string, f: Body = {}) => get(`/stats/segment/${kind}`, f);
export const getBoStatsReport = (f: Body = {}) => get("/stats/report", f);
