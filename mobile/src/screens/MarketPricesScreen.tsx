import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getMarketPrices } from "../api/marketPrices";

type MarketPrice = {
  id: string;
  product?: string;
  productName?: string;
  price: number;
  unit?: string;
  market?: string;
  region?: string;
  updatedAt?: string;
  createdAt?: string;
};

export default function MarketPricesScreen() {
  const [items, setItems] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getMarketPrices();
      setItems(data);
    } catch (err: any) {
      setError("Não foi possível carregar os preços de mercado.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = items.filter((p) => {
    const name = (p.product ?? p.productName ?? "").toLowerCase();
    return name.includes(search.toLowerCase());
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
      <Text style={styles.title}>Preços de Mercado</Text>

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
          <Text style={styles.emptyText}>Nenhum preço encontrado.</Text>
        }
        renderItem={({ item }) => {
          const date = item.updatedAt ?? item.createdAt;
          return (
            <View style={styles.card}>
              <Text style={styles.productName}>
                {item.product ?? item.productName ?? "Produto"}
              </Text>
              <Text style={styles.price}>
                {item.price} FCFA {item.unit ? `/ ${item.unit}` : ""}
              </Text>
              {item.market || item.region ? (
                <Text style={styles.meta}>
                  {[item.market, item.region].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
              {date ? (
                <Text style={styles.meta}>
                  Atualizado: {new Date(date).toLocaleDateString()}
                </Text>
              ) : null}
            </View>
          );
        }}
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
  price: { fontSize: 15, color: "#1B5E20", marginTop: 4, fontWeight: "600" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
});
