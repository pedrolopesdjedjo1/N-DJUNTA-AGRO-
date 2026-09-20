import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../services/productService";

export async function create(req: AuthRequest, res: Response) {
  try {
    const { title, description, category, price, unit, quantity, location } = req.body;

    if (!title || !category || !price || !unit || !quantity) {
      return res.status(400).json({
        error: "Preencha título, categoria, preço, unidade e quantidade.",
      });
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
    const product = await updateProduct(req.params.id, req.userId!, req.body);
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
