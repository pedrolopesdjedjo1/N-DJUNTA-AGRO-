import { api } from "./client";

export async function getUserReviews(userId: string) {
  const response = await api.get(`/api/reviews/user/${userId}`);
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data?.reviews ?? [];
}

export async function createReview(data: {
  targetId: string;
  rating: number;
  comment?: string;
  productId?: string;
}) {
  const response = await api.post("/api/reviews", data);
  return response.data;
}
