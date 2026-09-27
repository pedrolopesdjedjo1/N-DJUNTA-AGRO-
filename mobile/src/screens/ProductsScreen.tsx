
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getFavorites, addFavorite, removeFavorite } from "../api/favorites";

type Product = {
  id: string;
  title: string;
  ownerId: string;
  owner?: { id: string; name: string; role: string };
  price: number;
  unit?: string;
  category?: string;
};

export default function ProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const CATEGORIES = ["AGRICOLA", "PESCA", "COMERCIO", "ARTESANATO"];
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(favs.map((f: any) => f.productId));
    } catch (err) {
      console.log("Erro ao carregar favoritos", err);
    }
  }, []);

  async function toggleFavorite(productId: string) {
    const isFav = favoriteIds.includes(productId);
    try {
      if (isFav) {
        await removeFavorite(productId);
        setFavoriteIds((prev) => prev.filter((id) => id !== productId));
      } else {
        await addFavorite(productId);
        setFavoriteIds((prev) => [...prev, productId]);
      }
    } catch (err) {
      console.log("Erro ao favoritar", err);
    }
  }

  const loadProducts = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/api/products");
      setProducts(response.data.products || response.data || []);
    } catch (err: any) {
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadFavorites();
  }, [loadProducts, loadFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Produtos</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar produto..."
        value={search}
        onChangeText={setSearch}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
            style={{
              backgroundColor: categoryFilter === cat ? "#1B5E20" : "#eee",
              borderRadius: 16,
              paddingVertical: 6,
              paddingHorizontal: 14,
              marginRight: 8,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: categoryFilter === cat ? "#fff" : "#333", fontSize: 13 }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddProduct")}
      >
        <Text style={styles.addButtonText}>+ Cadastrar Produto</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.productName}>{item.title}</Text>
            <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
              <Text style={{ fontSize: 20 }}>
                {favoriteIds.includes(item.id) ? "❤️" : "🤍"}
              </Text>
            </TouchableOpacity>
          </View>
            <Text style={styles.productPrice}>
              {item.price} FCFA {item.unit ? `/ ${item.unit}` : ""}
            </Text>
            {item.category ? (
              <Text style={styles.productCategory}>{item.category}</Text>
            ) : null}

          {item.ownerId !== user?.id && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  userId: item.ownerId,
                  userName: item.owner?.name ?? "Vendedor",
                })
              }
            >
              <Text style={styles.contactButtonText}>Falar com vendedor</Text>
            </TouchableOpacity>
          )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B5E20", marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: "red", marginBottom: 8 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  productName: { fontSize: 16, fontWeight: "600" },
  productPrice: { fontSize: 14, color: "#1B5E20", marginTop: 4 },
  productCategory: { fontSize: 12, color: "#888", marginTop: 2 },
  addButton: {
    backgroundColor: "#1B5E20",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  contactButton: {
    backgroundColor: "#000",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  contactButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
