import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { createReview, getReviewsForUser, getAverageRating } from "../services/reviewService";

export async function create(req: AuthRequest, res: Response) {
  try {
    const { targetId, productId, rating, comment } = req.body;

    if (!targetId || !rating) {
      return res.status(400).json({ error: "Preencha o usuário avaliado e a nota." });
    }

    const review = await createReview({
      authorId: req.userId!,
      targetId,
      productId,
      rating,
      comment,
    });

    return res.status(201).json(review);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function listForUser(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params;

    const [reviews, summary] = await Promise.all([
      getReviewsForUser(userId),
      getAverageRating(userId),
    ]);

    return res.status(200).json({ reviews, summary });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
