import { api } from "./client";

export async function getConversations() {
  const response = await api.get("/api/messages/conversations");
  return response.data;
}

export async function getMessages(userId: string) {
  const response = await api.get(`/api/messages/${userId}`);
  return response.data;
}

export async function sendMessage(receiverId: string, content: string) {
  const response = await api.post("/api/messages", { receiverId, content });
  return response.data;
}
