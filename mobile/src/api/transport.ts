import { api } from "./client";

// Denunciar um problema (para todos os perfis). O servidor recebe-a na moderação da equipa.
export async function fileReport(body: Record<string, any>) {
  return (await api.post("/api/platform/reports", body)).data;
}

// As denúncias que a própria pessoa fez
export async function listMyReports() {
  return (await api.get("/api/platform/reports/mine")).data;
}
