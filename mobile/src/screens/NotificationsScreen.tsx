import { api } from "./client";

export async function getNotifications() {
  const response = await api.get("/api/notifications");
  return response.data.notifications || response.data || [];
}

export async function markAsRead(id: string) {
  await api.patch(`/api/notifications/${id}/read`);
}
