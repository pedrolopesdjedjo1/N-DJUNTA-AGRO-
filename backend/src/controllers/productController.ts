import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../services/productService";

// Só aceita vídeo que esteja no Storage público do Supabase
function isValidVideoUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const { title, description, category, price, unit, quantity, location, imageUrl, videoUrl } = req.body;

    if (!title || !category || !price || !unit || !quantity) {
      return res.status(400).json({
        error: "Preencha título, categoria, preço, unidade e quantidade.",
      });
    }

    if (videoUrl && !isValidVideoUrl(videoUrl)) {
      return res.status(400).json({ error: "Endereço de vídeo inválido." });
    }

    const product = await createProduct({
      ownerId: req.userId!,
      title,
      description,
      category,
      price,
      unit,
      quantity,
      location,
      imageUrl,
      videoUrl: videoUrl || undefined,
    });

    return res.status(201).json(product);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const { category, location } = req.query;

    const products = await listProducts({
      category: category as any,
      location: location as string | undefined,
    });

    return res.status(200).json(products);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  try {
    const product = await getProductById(req.params.id);
    return res.status(200).json(product);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const { title, description, price, quantity, isAvailable, imageUrl, videoUrl } = req.body;

    if (videoUrl && !isValidVideoUrl(videoUrl)) {
      return res.status(400).json({ error: "Endereço de vídeo inválido." });
    }

    // Só os campos permitidos (evita mudar dono, id etc.)
    const allowed: Record<string, any> = {};
    if (title !== undefined) allowed.title = title;
    if (description !== undefined) allowed.description = description;
    if (price !== undefined) allowed.price = price;
    if (quantity !== undefined) allowed.quantity = quantity;
    if (isAvailable !== undefined) allowed.isAvailable = isAvailable;
    if (imageUrl !== undefined) allowed.imageUrl = imageUrl;
    if (videoUrl !== undefined) allowed.videoUrl = videoUrl;

    const product = await updateProduct(req.params.id, req.userId!, allowed);
    return res.status(200).json(product);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  try {
    await deleteProduct(req.params.id, req.userId!);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
