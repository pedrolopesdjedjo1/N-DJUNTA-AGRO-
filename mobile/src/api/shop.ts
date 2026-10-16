import { api } from "./client";
import { cleanParams } from "./products";

export interface ShopFilters {
  q?: string;
  category?: string;
  department?: string;
  subcategory?: string;
  location?: string;
  near?: boolean;
  region?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  minRating?: number | string;
  onlyPromo?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

// ---------- Início, categorias e pesquisa ----------
export async function getShopHome(region?: string) {
  return (await api.get("/api/client/home", { params: cleanParams({ region }) })).data;
}

export async function getShopCategories(region?: string) {
  return (await api.get("/api/client/categories", { params: cleanParams({ region }) })).data;
}

export async function searchShop(filters: ShopFilters = {}) {
  const { near, onlyPromo, ...rest } = filters;
  const params = cleanParams({ ...rest, near: near ? "true" : "", onlyPromo: onlyPromo ? "true" : "" });
  return (await api.get("/api/client/products", { params })).data;
}

export async function getShopProduct(id: string) {
  return (await api.get(`/api/client/products/${id}`)).data;
}

export async function getShopSeller(id: string) {
  return (await api.get(`/api/client/sellers/${id}`)).data;
}

export async function getProductReviews(productId: string) {
  return (await api.get(`/api/client/products/${productId}/reviews`)).data;
}

// ---------- Favoritos ----------
export async function getShopFavorites() {
  return (await api.get("/api/client/favorites")).data;
}

export async function toggleFavoriteProduct(productId: string) {
  return (await api.post(`/api/client/favorites/products/${productId}`)).data;
}

export async function toggleFavoriteSeller(sellerId: string) {
  return (await api.post(`/api/client/favorites/sellers/${sellerId}`)).data;
}

export async function setSellerNotify(sellerId: string, notify: boolean) {
  return (await api.patch(`/api/client/favorites/sellers/${sellerId}`, { notify })).data;
}

// ---------- Endereços ----------
export async function getAddresses() {
  return (await api.get("/api/client/addresses")).data;
}

export async function createAddress(body: Record<string, any>) {
  return (await api.post("/api/client/addresses", body)).data;
}

export async function updateAddress(id: string, body: Record<string, any>) {
  return (await api.put(`/api/client/addresses/${id}`, body)).data;
}

export async function makeAddressDefault(id: string) {
  return (await api.post(`/api/client/addresses/${id}/default`)).data;
}

export async function deleteAddress(id: string) {
  return (await api.delete(`/api/client/addresses/${id}`)).data;
}

// ---------- Carrinho e encomenda ----------
export async function getCart(params: { addressId?: string; region?: string } = {}) {
  return (await api.get("/api/client/cart", { params: cleanParams(params) })).data;
}

export async function getCartCount() {
  return (await api.get("/api/client/cart/count")).data;
}

export async function addToCart(productId: string, quantity = 1) {
  return (await api.post("/api/client/cart", { productId, quantity })).data;
}

export async function setCartQuantity(productId: string, quantity: number) {
  return (await api.patch(`/api/client/cart/${productId}`, { quantity })).data;
}

export async function removeFromCart(productId: string) {
  return (await api.delete(`/api/client/cart/${productId}`)).data;
}

export async function clearCart() {
  return (await api.delete("/api/client/cart")).data;
}

export async function getCheckoutOptions() {
  return (await api.get("/api/client/checkout/options")).data;
}

export async function placeOrder(body: {
  deliveryMethod: "ENTREGA" | "RECOLHA";
  paymentMethod: string;
  addressId?: string;
  deliveryAddress?: string;
  region?: string;
  desiredDate?: string;
  notes?: string;
  productIds?: string[];
}) {
  return (await api.post("/api/client/checkout", body)).data;
}

// ---------- Minhas encomendas, pagamento, recibo e avaliações ----------
export async function getMyOrders(tab?: "current" | "completed" | "cancelled") {
  return (await api.get("/api/client/orders", { params: cleanParams({ tab }) })).data;
}

export async function getMyOrder(id: string) {
  return (await api.get(`/api/client/orders/${id}`)).data;
}

export async function cancelMyOrder(id: string) {
  return (await api.post(`/api/client/orders/${id}/cancel`)).data;
}

export async function confirmReceived(id: string) {
  return (await api.post(`/api/client/orders/${id}/received`)).data;
}

export async function changeOrderPayment(id: string, method: string) {
  return (await api.patch(`/api/client/orders/${id}/payment-method`, { method })).data;
}

export async function declarePayment(id: string, body: { method?: string; reference: string; phone?: string }) {
  return (await api.post(`/api/client/orders/${id}/pay`, body)).data;
}

export async function getMyPayments() {
  return (await api.get("/api/client/payments")).data;
}

export async function getReceipt(id: string) {
  return (await api.get(`/api/client/orders/${id}/receipt`)).data;
}

export async function getReviewables(id: string) {
  return (await api.get(`/api/client/orders/${id}/reviews`)).data;
}

export async function postOrderReview(
  id: string,
  body: { kind: "PRODUTO" | "VENDEDOR" | "TRANSPORTADOR"; rating: number; comment?: string; imageUrl?: string; productId?: string }
) {
  return (await api.post(`/api/client/orders/${id}/reviews`, body)).data;
}

export async function getMyReviews() {
  return (await api.get("/api/client/reviews/mine")).data;
}

// ---------- Extras e perfil ----------
export async function getNearbyOffers(region?: string) {
  return (await api.get("/api/client/offers", { params: cleanParams({ region }) })).data;
}

export async function getPaymentMethods() {
  return (await api.get("/api/client/payment-methods")).data;
}

export async function createPaymentMethod(body: { kind: string; label?: string; phone?: string; isDefault?: boolean }) {
  return (await api.post("/api/client/payment-methods", body)).data;
}

export async function updatePaymentMethod(id: string, body: Record<string, any>) {
  return (await api.put(`/api/client/payment-methods/${id}`, body)).data;
}

export async function deletePaymentMethod(id: string) {
  return (await api.delete(`/api/client/payment-methods/${id}`)).data;
}

export async function getClientProfile() {
  return (await api.get("/api/client/profile")).data;
}

export async function updateClientProfile(body: { name?: string; photoUrl?: string | null }) {
  return (await api.put("/api/client/profile", body)).data;
}

export async function getBadges() {
  return (await api.get("/api/client/summary")).data;
}
