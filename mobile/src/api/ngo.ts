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

// ---------- Catálogo ----------
export async function getNgoCatalog() {
  return (await api.get("/api/ngo/catalog")).data;
}

// ---------- Organização ----------
export async function getOrganization() {
  return (await api.get("/api/ngo/organization")).data;
}

export async function saveOrganization(body: Body) {
  return (await api.put("/api/ngo/organization", body)).data;
}

export async function addOrgDocument(body: { kind: string; name: string; url: string }) {
  return (await api.post("/api/ngo/organization/documents", body)).data;
}

export async function deleteOrgDocument(id: string) {
  return (await api.delete(`/api/ngo/organization/documents/${id}`)).data;
}

export async function submitOrgVerification() {
  return (await api.post("/api/ngo/organization/verification/submit")).data;
}

export async function getPublicOrganization(ownerId: string) {
  return (await api.get(`/api/ngo/public/${ownerId}`)).data;
}

export async function getPendingVerifications() {
  return (await api.get("/api/ngo/verification/pending")).data;
}

export async function reviewVerification(ownerId: string, approve: boolean, note?: string) {
  return (await api.post(`/api/ngo/verification/${ownerId}/review`, { approve, note })).data;
}

// ---------- Projetos ----------
export async function listNgoProjects(filters: { status?: string; area?: string; focus?: string; q?: string } = {}) {
  return (await api.get("/api/ngo/projects", { params: params(filters) })).data;
}

export async function getNgoProject(id: string) {
  return (await api.get(`/api/ngo/projects/${id}`)).data;
}

export async function createNgoProject(body: Body) {
  return (await api.post("/api/ngo/projects", body)).data;
}

export async function updateNgoProject(id: string, body: Body) {
  return (await api.put(`/api/ngo/projects/${id}`, body)).data;
}

export async function deleteNgoProject(id: string) {
  return (await api.delete(`/api/ngo/projects/${id}`)).data;
}

export async function addProjectMedia(id: string, body: { kind: "IMAGE" | "VIDEO"; url: string; caption?: string }) {
  return (await api.post(`/api/ngo/projects/${id}/media`, body)).data;
}

export async function deleteProjectMedia(id: string, mediaId: string) {
  return (await api.delete(`/api/ngo/projects/${id}/media/${mediaId}`)).data;
}

export async function addProjectUpdate(id: string, body: { title: string; body?: string; progress?: number }) {
  return (await api.post(`/api/ngo/projects/${id}/updates`, body)).data;
}

export async function deleteProjectUpdate(id: string, updateId: string) {
  return (await api.delete(`/api/ngo/projects/${id}/updates/${updateId}`)).data;
}

export async function addProjectResult(id: string, body: Body) {
  return (await api.post(`/api/ngo/projects/${id}/results`, body)).data;
}

export async function deleteProjectResult(id: string, resultId: string) {
  return (await api.delete(`/api/ngo/projects/${id}/results/${resultId}`)).data;
}

export async function listPublicProjects(filters: { area?: string; region?: string; q?: string; status?: string } = {}) {
  return (await api.get("/api/ngo/public-projects", { params: params(filters) })).data;
}

export async function getPublicProject(id: string) {
  return (await api.get(`/api/ngo/public-projects/${id}`)).data;
}

// ---------- Comunidades, necessidades e beneficiários ----------
export async function listCommunities(filters: { type?: string; region?: string; q?: string } = {}) {
  return (await api.get("/api/ngo/communities", { params: params(filters) })).data;
}

export async function createCommunity(body: Body) {
  return (await api.post("/api/ngo/communities", body)).data;
}

export async function updateCommunity(id: string, body: Body) {
  return (await api.put(`/api/ngo/communities/${id}`, body)).data;
}

export async function deleteCommunity(id: string) {
  return (await api.delete(`/api/ngo/communities/${id}`)).data;
}

export async function listNeeds(
  filters: { communityId?: string; category?: string; status?: string; priority?: string; region?: string } = {}
) {
  return (await api.get("/api/ngo/needs", { params: params(filters) })).data;
}

export async function createNeed(body: Body) {
  return (await api.post("/api/ngo/needs", body)).data;
}

export async function updateNeed(id: string, body: Body) {
  return (await api.put(`/api/ngo/needs/${id}`, body)).data;
}

export async function deleteNeed(id: string) {
  return (await api.delete(`/api/ngo/needs/${id}`)).data;
}

export async function listBeneficiaries(
  filters: {
    projectId?: string;
    communityId?: string;
    sector?: string;
    gender?: string;
    youth?: boolean;
    linked?: boolean;
    q?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  return (await api.get("/api/ngo/beneficiaries", { params: params(filters) })).data;
}

export async function createBeneficiary(body: Body) {
  return (await api.post("/api/ngo/beneficiaries", body)).data;
}

export async function createBeneficiariesBulk(body: Body) {
  return (await api.post("/api/ngo/beneficiaries/bulk", body)).data;
}

export async function updateBeneficiary(id: string, body: Body) {
  return (await api.put(`/api/ngo/beneficiaries/${id}`, body)).data;
}

export async function deleteBeneficiary(id: string) {
  return (await api.delete(`/api/ngo/beneficiaries/${id}`)).data;
}

export async function getSupportOverview() {
  return (await api.get("/api/ngo/support-overview")).data;
}

export async function discoverPeople(filters: { kind?: string; region?: string; q?: string; page?: number } = {}) {
  return (await api.get("/api/ngo/discover", { params: params(filters) })).data;
}

export async function listOrganizations(filters: { q?: string; region?: string; area?: string; verified?: boolean } = {}) {
  return (await api.get("/api/ngo/organizations", { params: params(filters) })).data;
}

// ---------- Pedidos de apoio ----------
export async function createSupportRequest(body: Body) {
  return (await api.post("/api/ngo/requests", body)).data;
}

export async function getMyRequests() {
  return (await api.get("/api/ngo/requests/mine")).data;
}

export async function deleteMyRequest(id: string) {
  return (await api.delete(`/api/ngo/requests/${id}`)).data;
}

export async function listRequests(filters: { scope?: string; status?: string } = {}) {
  return (await api.get("/api/ngo/requests", { params: params(filters) })).data;
}

export async function answerRequest(id: string, body: { status: string; answer?: string }) {
  return (await api.patch(`/api/ngo/requests/${id}`, body)).data;
}

export async function requestToBeneficiary(id: string, body: { projectId?: string; communityId?: string } = {}) {
  return (await api.post(`/api/ngo/requests/${id}/beneficiary`, body)).data;
}

// ---------- Financiamento, despesas e parceiros ----------
export async function listFunding(filters: { status?: string; projectId?: string; kind?: string } = {}) {
  return (await api.get("/api/ngo/funding", { params: params(filters) })).data;
}

export async function createFunding(body: Body) {
  return (await api.post("/api/ngo/funding", body)).data;
}

export async function updateFunding(id: string, body: Body) {
  return (await api.put(`/api/ngo/funding/${id}`, body)).data;
}

export async function deleteFunding(id: string) {
  return (await api.delete(`/api/ngo/funding/${id}`)).data;
}

export async function listExpenses(filters: { projectId?: string; category?: string; from?: string; to?: string } = {}) {
  return (await api.get("/api/ngo/expenses", { params: params(filters) })).data;
}

export async function createExpense(body: Body) {
  return (await api.post("/api/ngo/expenses", body)).data;
}

export async function deleteExpense(id: string) {
  return (await api.delete(`/api/ngo/expenses/${id}`)).data;
}

export async function getFinanceReport(filters: { projectId?: string; from?: string; to?: string } = {}) {
  return (await api.get("/api/ngo/finance/report", { params: params(filters) })).data;
}

export async function listPartners(filters: { type?: string; status?: string; q?: string } = {}) {
  return (await api.get("/api/ngo/partners", { params: params(filters) })).data;
}

export async function getPartner(id: string) {
  return (await api.get(`/api/ngo/partners/${id}`)).data;
}

export async function createPartner(body: Body) {
  return (await api.post("/api/ngo/partners", body)).data;
}

export async function updatePartner(id: string, body: Body) {
  return (await api.put(`/api/ngo/partners/${id}`, body)).data;
}

export async function deletePartner(id: string) {
  return (await api.delete(`/api/ngo/partners/${id}`)).data;
}

export async function getProjectPartners(projectId: string) {
  return (await api.get(`/api/ngo/projects/${projectId}/partners`)).data;
}

export async function linkProjectPartner(projectId: string, body: { partnerId: string; role?: string }) {
  return (await api.post(`/api/ngo/projects/${projectId}/partners`, body)).data;
}

export async function unlinkProjectPartner(projectId: string, partnerId: string) {
  return (await api.delete(`/api/ngo/projects/${projectId}/partners/${partnerId}`)).data;
}

// ---------- Início, monitoramento, relatórios e mapa ----------
export async function getNgoHome() {
  return (await api.get("/api/ngo/home")).data;
}

export async function getMonitoring(filters: { projectId?: string; from?: string; to?: string } = {}) {
  return (await api.get("/api/ngo/monitoring", { params: params(filters) })).data;
}

export async function getNgoReport(
  filters: { projectId?: string; from?: string; to?: string; includeFinance?: boolean } = {}
) {
  return (await api.get("/api/ngo/reports", { params: params(filters) })).data;
}

export async function getNgoMap(filters: { layers?: string; scope?: string } = {}) {
  return (await api.get("/api/ngo/map", { params: params(filters) })).data;
}

// ---------- Formação ----------
export async function getMyTrainings(filters: { when?: string; q?: string } = {}) {
  return (await api.get("/api/trainings/mine", { params: params(filters) })).data;
}

export async function getManagedTraining(id: string) {
  return (await api.get(`/api/trainings/manage/${id}`)).data;
}

export async function listTrainings(
  filters: { kind?: string; area?: string; region?: string; q?: string; when?: string } = {}
) {
  return (await api.get("/api/trainings", { params: params(filters) })).data;
}

export async function getTraining(id: string) {
  return (await api.get(`/api/trainings/${id}`)).data;
}

export async function createTraining(body: Body) {
  return (await api.post("/api/trainings", body)).data;
}

export async function updateTraining(id: string, body: Body) {
  return (await api.put(`/api/trainings/${id}`, body)).data;
}

export async function cancelTraining(id: string, reason?: string) {
  return (await api.post(`/api/trainings/${id}/cancel`, { reason })).data;
}

export async function deleteTraining(id: string) {
  return (await api.delete(`/api/trainings/${id}`)).data;
}

export async function addParticipant(id: string, body: Body) {
  return (await api.post(`/api/trainings/${id}/participants`, body)).data;
}

export async function updateParticipant(id: string, enrollmentId: string, status: string) {
  return (await api.patch(`/api/trainings/${id}/participants/${enrollmentId}`, { status })).data;
}

export async function completeAttendees(id: string) {
  return (await api.post(`/api/trainings/${id}/complete-attendees`)).data;
}

export async function removeParticipant(id: string, enrollmentId: string) {
  return (await api.delete(`/api/trainings/${id}/participants/${enrollmentId}`)).data;
}

export async function addTrainingMaterial(id: string, body: { kind: string; title: string; url: string }) {
  return (await api.post(`/api/trainings/${id}/materials`, body)).data;
}

export async function deleteTrainingMaterial(id: string, materialId: string) {
  return (await api.delete(`/api/trainings/${id}/materials/${materialId}`)).data;
}

export async function enrollInTraining(id: string) {
  return (await api.post(`/api/trainings/${id}/enroll`)).data;
}

export async function leaveTraining(id: string) {
  return (await api.delete(`/api/trainings/${id}/enroll`)).data;
}

export async function getMyEnrollments() {
  return (await api.get("/api/trainings/enrollments/mine")).data;
}

export async function getCertificate(enrollmentId: string) {
  return (await api.get(`/api/trainings/enrollments/${enrollmentId}/certificate`)).data;
}

export async function verifyCertificate(code: string) {
  return (await api.get(`/api/trainings/certificates/${encodeURIComponent(code)}`)).data;
}

// ---------- Oportunidades ----------
export async function listOpportunities(
  filters: { kind?: string; area?: string; region?: string; q?: string; when?: string } = {}
) {
  return (await api.get("/api/opportunities", { params: params(filters) })).data;
}

export async function getOpportunity(id: string) {
  return (await api.get(`/api/opportunities/${id}`)).data;
}

export async function getMyOpportunities() {
  return (await api.get("/api/opportunities/mine")).data;
}

export async function createOpportunity(body: Body) {
  return (await api.post("/api/opportunities", body)).data;
}

export async function updateOpportunity(id: string, body: Body) {
  return (await api.put(`/api/opportunities/${id}`, body)).data;
}

export async function closeOpportunity(id: string) {
  return (await api.post(`/api/opportunities/${id}/close`)).data;
}

export async function reopenOpportunity(id: string) {
  return (await api.post(`/api/opportunities/${id}/reopen`)).data;
}

export async function deleteOpportunity(id: string) {
  return (await api.delete(`/api/opportunities/${id}`)).data;
}

export async function applyToOpportunity(id: string, body: { message?: string; phone?: string } = {}) {
  return (await api.post(`/api/opportunities/${id}/apply`, body)).data;
}

export async function withdrawApplication(id: string) {
  return (await api.delete(`/api/opportunities/${id}/apply`)).data;
}

export async function getMyApplications() {
  return (await api.get("/api/opportunities/applications/mine")).data;
}

export async function listApplicants(id: string, status?: string) {
  return (await api.get(`/api/opportunities/${id}/applications`, { params: params({ status }) })).data;
}

export async function answerApplication(id: string, applicationId: string, body: { status: string; answer?: string }) {
  return (await api.patch(`/api/opportunities/${id}/applications/${applicationId}`, body)).data;
}

// ---------- Publicações ----------
export async function listPublications(
  filters: { kind?: string; region?: string; ownerId?: string; projectId?: string; q?: string; page?: number } = {}
) {
  return (await api.get("/api/publications", { params: params(filters) })).data;
}

export async function getPublication(id: string) {
  return (await api.get(`/api/publications/${id}`)).data;
}

export async function getMyPublications(filters: { kind?: string; draft?: boolean } = {}) {
  return (await api.get("/api/publications/mine", { params: params(filters) })).data;
}

export async function createPublication(body: Body) {
  return (await api.post("/api/publications", body)).data;
}

export async function updatePublication(id: string, body: Body) {
  return (await api.put(`/api/publications/${id}`, body)).data;
}

export async function deletePublication(id: string) {
  return (await api.delete(`/api/publications/${id}`)).data;
}
