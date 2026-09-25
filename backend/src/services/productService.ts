import { ProductCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface CreateProductInput {
  ownerId: string;
  title: string;
  description?: string;
  category: ProductCategory;
  price: number;
  unit: string;
  quantity: number;
  location?: string;
}

interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: number;
  quantity?: number;
  isAvailable?: boolean;
}

export async function createProduct(data: CreateProductInput) {
  return prisma.product.create({
    data: {
      ownerId: data.ownerId,
      title: data.title,
      description: data.description,
      category: data.category,
      price: data.price,
      unit: data.unit,
      quantity: data.quantity,
      location: data.location,
    },
  });
}

export async function listProducts(filters: { category?: ProductCategory; location?: string }) {
  return prisma.product.findMany({
    where: {
      isAvailable: true,
      category: filters.category,
      location: filters.location ? { contains: filters.location, mode: "insensitive" } : undefined,
    },
    include: {
      owner: {
        select: { id: true, name: true, role: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, role: true, phone: true, location: true },
      },
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  return product;
}

export async function updateProduct(id: string, ownerId: string, data: UpdateProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  if (product.ownerId !== ownerId) {
    throw new Error("Você não tem permissão para editar este produto.");
  }

  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function deleteProduct(id: string, ownerId: string) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  if (product.ownerId !== ownerId) {
    throw new Error("Você não tem permissão para excluir este produto.");
  }

  return prisma.product.delete({ where: { id } });
}
