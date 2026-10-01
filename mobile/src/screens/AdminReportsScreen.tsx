import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getReports, updateReportStatus } from "../api/reports";

const GREEN = "#1B5E20";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANALISE: "Em análise",
  RESOLVIDA: "Resolvida",
  REJEITADA: "Rejeitada",
};

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "#F9A825",
  EM_ANALISE: "#1565C0",
  RESOLVIDA: GREEN,
  REJEITADA: "#B71C1C",
};

const FILTERS = ["", "PENDENTE", "EM_ANALISE", "RESOLVIDA", "REJEITADA"];

const ACTIONS = [
  { status: "EM_ANALISE", label: "Em análise" },
  { status: "RESOLVIDA", label: "Resolver" },
  { status: "REJEITADA", label: "Rejeitar" },
];

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getReports(filter || undefined);
      setReports(data);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError("Acesso restrito a administradores.");
      } else {
        setError("Não foi possível carregar as denúncias.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setLoading(true);
      load();
    } else {
      setLoading(false);
    }
  }, [load, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const changeStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await updateReportStatus(id, status);
      await load();
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error ||
          err?.message ||
          "Não foi possível atualizar a denúncia."
      );
    } finally {
      setBusyId(null);
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedText}>
          Acesso restrito a administradores.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Denúncias</Text>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f || "ALL"}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, filter === f && styles.chipTextActive]}
            >
              {f ? STATUS_LABELS[f] : "Todas"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item, index) => String(item.id ?? index)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma denúncia encontrada.</Text>
          }
          renderItem={({ item }) => {
            const status = String(item.status ?? "PENDENTE");
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardType}>
                    {item.targetType === "PRODUCT"
                      ? "Produto denunciado"
                      : "Usuário denunciado"}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: STATUS_COLORS[status] ?? "#666" },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {STATUS_LABELS[status] ?? status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardReason}>{item.reason}</Text>

                <Text style={styles.cardMeta}>
                  Alvo (ID): {String(item.targetId ?? "").slice(0, 8)}...
                </Text>
                {item.reporter?.name ? (
                  <Text style={styles.cardMeta}>
                    Denunciante: {item.reporter.name}
                  </Text>
                ) : null}
                {item.createdAt ? (
                  <Text style={styles.cardMeta}>
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                ) : null}

                <View style={styles.actionRow}>
                  {ACTIONS.filter((a) => a.status !== status).map((a) => (
                    <TouchableOpacity
                      key={a.status}
                      style={[
                        styles.actionButton,
                        { borderColor: STATUS_COLORS[a.status] },
                      ]}
                      onPress={() => changeStatus(item.id, a.status)}
                      disabled={busyId === item.id}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          { color: STATUS_COLORS[a.status] },
                        ]}
                      >
                        {busyId === item.id ? "..." : a.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "bold", color: GREEN, marginBottom: 12 },
  deniedText: { fontSize: 16, color: "#666", textAlign: "center" },
  errorText: { color: "red", marginBottom: 8 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: {
    backgroundColor: "#eee",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: GREEN },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardType: { fontSize: 14, fontWeight: "700", color: "#222" },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cardReason: { fontSize: 14, color: "#444", marginTop: 8 },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 4 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  actionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  actionText: { fontSize: 13, fontWeight: "600" },
});
