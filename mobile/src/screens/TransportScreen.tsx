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
import { useAuth } from "../context/AuthContext";
import { getTransports } from "../api/transport";

type Transport = {
  id: string;
  title?: string;
  vehicleType?: string;
  origin?: string;
  destination?: string;
  price?: number;
  capacity?: string | number;
  description?: string;
  ownerId?: string;
  userId?: string;
  owner?: { id: string; name: string };
  user?: { id: string; name: string };
};

export default function TransportScreen({ navigation }: any) {
  const [items, setItems] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getTransports();
      setItems(data);
    } catch (err: any) {
      setError("Não foi possível carregar os transportes.");
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

  const filtered = items.filter((t) => {
    const text = [t.title, t.vehicleType, t.origin, t.destination]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(search.toLowerCase());
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
      <Text style={styles.title}>Transporte</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por origem, destino ou veículo..."
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
          <Text style={styles.emptyText}>Nenhum transporte encontrado.</Text>
        }
        renderItem={({ item }) => {
          const ownerId = item.ownerId ?? item.userId ?? item.owner?.id ?? item.user?.id;
          const ownerName = item.owner?.name ?? item.user?.name ?? "Transportador";
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.title ?? item.vehicleType ?? "Transporte"}
              </Text>
              {item.origin || item.destination ? (
                <Text style={styles.route}>
                  {item.origin ?? "?"} → {item.destination ?? "?"}
                </Text>
              ) : null}
              {item.vehicleType && item.title ? (
                <Text style={styles.meta}>Veículo: {item.vehicleType}</Text>
              ) : null}
              {item.capacity ? (
                <Text style={styles.meta}>Capacidade: {item.capacity}</Text>
              ) : null}
              {item.price != null ? (
                <Text style={styles.price}>{item.price} FCFA</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.meta}>{item.description}</Text>
              ) : null}

              {ownerId && ownerId !== user?.id && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    navigation.navigate("Chat", {
                      userId: ownerId,
                      userName: ownerName,
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>
                    Falar com transportador
                  </Text>
                </TouchableOpacity>
              )}
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
  cardTitle: { fontSize: 16, fontWeight: "600" },
  route: { fontSize: 14, color: "#333", marginTop: 4 },
  price: { fontSize: 15, color: "#1B5E20", marginTop: 4, fontWeight: "600" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  contactButton: {
    backgroundColor: "#000",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  contactButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
