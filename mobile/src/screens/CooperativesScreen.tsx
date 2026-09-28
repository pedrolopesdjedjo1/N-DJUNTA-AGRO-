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
import { getCooperatives } from "../api/cooperatives";

type Cooperative = {
  id: string;
  name?: string;
  description?: string;
  region?: string;
  location?: string;
  category?: string;
  membersCount?: number;
  _count?: { members?: number };
  members?: any[];
  ownerId?: string;
  leaderId?: string;
  owner?: { id: string; name: string };
  leader?: { id: string; name: string };
};

export default function CooperativesScreen({ navigation }: any) {
  const [items, setItems] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getCooperatives();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError("Não foi possível carregar as cooperativas.");
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

  const filtered = items.filter((c) => {
    const text = [c.name, c.region, c.location, c.category]
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
      <Text style={styles.title}>Cooperativas</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar cooperativa..."
        value={search}
        onChangeText={setSearch}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? index)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma cooperativa encontrada.</Text>
        }
        renderItem={({ item }) => {
          const leaderId =
            item.leaderId ?? item.ownerId ?? item.leader?.id ?? item.owner?.id;
          const leaderName =
            item.leader?.name ?? item.owner?.name ?? "Responsável";
          const members =
            item.membersCount ?? item._count?.members ?? item.members?.length;
          const place = item.region ?? item.location;
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name ?? "Cooperativa"}</Text>
              {item.category ? (
                <Text style={styles.category}>{item.category}</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
              {place ? <Text style={styles.meta}>Local: {place}</Text> : null}
              {members != null ? (
                <Text style={styles.meta}>Membros: {members}</Text>
              ) : null}

              {leaderId && leaderId !== user?.id && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    navigation.navigate("Chat", {
                      userId: leaderId,
                      userName: leaderName,
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>
                    Falar com o responsável
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
  category: { fontSize: 12, color: "#1B5E20", marginTop: 2, fontWeight: "600" },
  description: { fontSize: 14, color: "#333", marginTop: 4 },
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
