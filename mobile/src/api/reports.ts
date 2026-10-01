import { api } from "./client";

export async function getReports(status?: string) {
  const response = await api.get("/api/reports", {
    params: status ? { status } : undefined,
  });
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data?.reports ?? [];
}

export async function updateReportStatus(id: string, status: string) {
  const response = await api.patch(`/api/reports/${id}/status`, { status });
  return response.data;
}

export async function createReport(data: {
  targetType: "USER" | "PRODUCT";
  targetId: string;
  reason: string;
}) {
  const response = await api.post("/api/reports", data);
  return response.data;
}
