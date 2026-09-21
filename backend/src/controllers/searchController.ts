import { Request, Response } from "express";
import { searchProducts } from "../services/searchService";

export async function search(req: Request, res: Response) {
  try {
    const { query, category, location, minPrice, maxPrice, sortBy } = req.query;

    const products = await searchProducts({
      query: query as string | undefined,
      category: category as any,
      location: location as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy as "recent" | "price_asc" | "price_desc" | undefined,
    });

    return res.status(200).json(products);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
