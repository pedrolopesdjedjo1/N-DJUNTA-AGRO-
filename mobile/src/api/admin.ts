import { api } from "./client";

export async function getAdminStats() {
  const response = await api.get("/api/admin/stats");
  return response.data;
}
