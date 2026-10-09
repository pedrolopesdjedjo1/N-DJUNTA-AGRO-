import { api } from "./client";

export function cleanParams(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  });
  return out;
}

export interface ProductFilters {
  q?: string;
  department?: string;
  subcategory?: string;
  location?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  estado?: string;
  minRating?: number | string;
  sort?: string;
  ownerId?: string;
}

export async function fetchProducts(filters: ProductFilters = {}) {
  const response = await api.get("/api/products", { params: cleanParams(filters) });
  const data = response.data;
  return Array.isArray(data) ? data : data?.products ?? [];
}

export async function fetchProduct(id: string) {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
}

export async function createProduct(body: Record<string, any>) {
  const response = await api.post("/api/products", body);
  return response.data;
}

export async function updateProduct(id: string, body: Record<string, any>) {
  const response = await api.put(`/api/products/${id}`, body);
  return response.data;
}

export async function removeProduct(id: string) {
  await api.delete(`/api/products/${id}`);
}
