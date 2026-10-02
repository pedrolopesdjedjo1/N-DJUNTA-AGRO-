import { api } from "./client";

// Lista as conversas do usuário (a mais recente de cada pessoa/produto)
export async function getConversations() {
  const response = await api.get("/api/messages");
  return response.data;
}

// Mensagens trocadas com uma pessoa
export async function getMessages(userId: string) {
  const response = await api.get(`/api/messages/with/${userId}`);
  return response.data;
}

export async function sendMessage(receiverId: string, content: string, productId?: string) {
  const response = await api.post("/api/messages", {
    receiverId,
    content,
    ...(productId ? { productId } : {}),
  });
  return response.data;
}
