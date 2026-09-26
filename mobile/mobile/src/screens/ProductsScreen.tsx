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

type Product = {
  id: string;
  name: string;
  price: number;
  unit?: string;
  category?: string;
};

export default function ProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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
  }, [loadProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

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
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>
              {item.price} FCFA {item.unit ? `/ ${item.unit}` : ""}
            </Text>
            {item.category ? (
              <Text style={styles.productCategory}>{item.category}</Text>
            ) : null}
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
});
