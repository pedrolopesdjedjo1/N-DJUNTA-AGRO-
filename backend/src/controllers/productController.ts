import { Response } from "express";
import { ProductCategory } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  ProductInput,
} from "../services/productService";

export const DEPARTMENTS = [
  "ALIMENTACAO",
  "ROUPA_MODA",
  "CASA",
  "CONSTRUCAO",
  "TECNOLOGIA",
  "VEICULOS",
  "AGRICULTURA",
  "PESCA",
  "ARTESANATO",
  "OUTROS",
];

const CATEGORY_OF: Record<string, ProductCategory> = {
  AGRICULTURA: "AGRICOLA",
  PESCA: "PESCA",
  ARTESANATO: "ARTESANATO",
};

const DETAIL_KEYS = [
  "brand",
  "model",
  "estado",
  "color",
  "colors",
  "size",
  "weight",
  "materials",
  "productionTime",
  "tipo",
  "deliveryOptions",
  "saleConditions",
];

function isValidMediaUrl(url: any): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co/storage/v1/object/public/")
  );
}

function cleanDetails(input: any): Record<string, string> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const key of DETAIL_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim().slice(0, 300);
  }
  if (out.estado && !["NOVO", "USADO"].includes(out.estado)) delete out.estado;
  if (out.tipo && !["PRODUTO", "MATERIAL", "FERRAMENTA"].includes(out.tipo)) delete out.tipo;
  return Object.keys(out).length ? out : undefined;
}

function str(value: any): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: any): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return isNaN(n) ? undefined : n;
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const { title, description, category, department, subcategory, unit, location, imageUrl, videoUrl, details } =
      req.body;
    const price = Number(req.body.price);
    const quantity = Number(req.body.quantity);

    if (!title || !unit || !price || !quantity || (!category && !department)) {
      return res.status(400).json({
        error: "Preencha nome, departamento, preço, unidade e quantidade.",
      });
    }

    if (department && !DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: "Departamento inválido." });
    }

    if (videoUrl && !isValidMediaUrl(videoUrl)) {
      return res.status(400).json({ error: "Endereço de vídeo inválido." });
    }

    const finalCategory = (department ? CATEGORY_OF[department] ?? "OUTRO" : category) as ProductCategory;

    const product = await createProduct({
      ownerId: req.userId!,
      title,
      description,
      category: finalCategory,
      department,
      subcategory,
      price,
      unit,
      quantity,
      location,
      imageUrl,
      videoUrl: videoUrl || undefined,
      details: cleanDetails(details),
    });

    return res.status(201).json(product);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const mine = req.query.mine === "true";

    if (mine && !req.userId) {
      return res.status(401).json({ error: "Faça login para ver os seus produtos." });
    }

    const products = await listProducts({
      q: str(req.query.q),
      category: str(req.query.category) as ProductCategory | undefined,
      department: str(req.query.department),
      subcategory: str(req.query.subcategory),
      location: str(req.query.location),
      minPrice: num(req.query.minPrice),
      maxPrice: num(req.query.maxPrice),
      estado: str(req.query.estado),
      tipo: str(req.query.tipo),
      minRating: num(req.query.minRating),
      sort: str(req.query.sort),
      ownerId: mine ? req.userId : str(req.query.ownerId),
      includeUnavailable: mine,
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
    const { title, description, subcategory, location, imageUrl, videoUrl, isAvailable, department, details } =
      req.body;

    if (videoUrl && !isValidMediaUrl(videoUrl)) {
      return res.status(400).json({ error: "Endereço de vídeo inválido." });
    }
    if (department && !DEPARTMENTS.includes(department)) {
      return res.status(400).json({ error: "Departamento inválido." });
    }

    const allowed: ProductInput = {};
    if (title !== undefined) allowed.title = title;
    if (description !== undefined) allowed.description = description;
    if (subcategory !== undefined) allowed.subcategory = subcategory;
    if (location !== undefined) allowed.location = location;
    if (imageUrl !== undefined) allowed.imageUrl = imageUrl;
    if (videoUrl !== undefined) allowed.videoUrl = videoUrl;
    if (isAvailable !== undefined) allowed.isAvailable = Boolean(isAvailable);
    if (req.body.price !== undefined) allowed.price = Number(req.body.price);
    if (req.body.quantity !== undefined) allowed.quantity = Number(req.body.quantity);
    if (department !== undefined) {
      allowed.department = department;
      allowed.category = (CATEGORY_OF[department] ?? "OUTRO") as ProductCategory;
    }
    const cleaned = cleanDetails(details);
    if (cleaned) allowed.details = cleaned;

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
