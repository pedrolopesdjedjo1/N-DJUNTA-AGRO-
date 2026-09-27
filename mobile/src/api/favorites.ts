cat > src/api/favorites.ts << 'EOF'
import { api } from "./client";

export async function getFavorites() {
  const response = await api.get("/api/favorites");
  return response.data;
}

export async function addFavorite(productId: string) {
  const response = await api.post("/api/favorites", { productId });
  return response.data;
}

export async function removeFavorite(productId: string) {
  await api.delete(`/api/favorites/${productId}`);
}
EOF
