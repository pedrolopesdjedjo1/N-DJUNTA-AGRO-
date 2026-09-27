import { api } from "./client";

export async function getReviewsForUser(userId: string) {
  const response = await api.get(`/api/reviews/user/${userId}`);
  return response.data;
}

export async function createReview(targetId: string, rating: number, comment: string) {
  const response = await api.post("/api/reviews", { targetId, rating, comment });
  return response.data;
}
