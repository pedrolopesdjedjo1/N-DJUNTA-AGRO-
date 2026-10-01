import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getAdminStats } from "../api/admin";

const GREEN = "#1B5E20";

const TRANSLATIONS: Record<string, string> = {
  totalUsers: "Usuários",
  totalProducts: "Produtos",
  totalMessages: "Mensagens",
  totalReviews: "Avaliações",
  totalReports: "Denúncias",
  totalPayments: "Pagamentos",
  totalCooperatives: "Cooperativas",
  totalNotifications: "Notificações",
  totalFavorites: "Favoritos",
  totalTransportOffers: "Ofertas de transporte",
  usersByRole: "Usuários por perfil",
  productsByCategory: "Produtos por categoria",
};

function capitalizeWords(text: string) {
  return text
    .toLowerCase()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function label(key: string) {
  if (TRANSLATIONS[key]) return TRANSLATIONS[key];
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return capitalizeWords(spaced);
}

function formatValue(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") return value;
  return null;
}

type Row = { key: string; label: string; value: string };
type Section = { title: string; rows: Row[] };

function itemName(item: any): string {
  const name =
    item?.role ?? item?.category ?? item?.name ?? item?.title ?? item?.type ?? item?.status;
  return name ? capitalizeWords(String(name)) : "Item";
}

function itemCount(item: any): number | null {
  const candidates = [
    item?.count,
    item?.total,
    item?.quantity,
    item?._count,
    item?._count?.role,
    item?._count?.category,
    item?._count?.id,
    item?._count?._all,
  ];
  for (const c of candidates) {
    if (typeof c === "number") return c;
  }
  return null;
}

function rowsFromObject(obj: any): Row[] {
  const rows: Row[] = [];
  Object.keys(obj || {}).forEach((key) => {
    const formatted = formatValue(obj[key]);
    if (formatted !== null) rows.push({ key, label: label(key), value: formatted });
  });
  return rows;
}

function rowsFromArray(arr: any[]): Row[] {
  const rows: Row[] = [];
  arr.forEach((item, index) => {
    if (item && typeof item === "object") {
      const count = itemCount(item);
      if (count !== null) {
        rows.push({
          key: `${itemName(item)}-${index}`,
          label: itemName(item),
          value: count.toLocaleString("pt-BR"),
        });
      }
    }
  });
  return rows;
}

function toSections(data: any): Section[] {
  if (!data || typeof data !== "object") return [];
  const sections: Section[] = [];

  const general = rowsFromObject(data);
  if (general.length > 0) {
    sections.push({ title: "Resumo", rows: general });
  }

  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (Array.isArray(value)) {
      const rows = rowsFromArray(value);
      if (rows.length > 0) sections.push({ title: label(key), rows });
    } else if (value && typeof value === "object") {
      const rows = rowsFromObject(value);
      if (rows.length > 0) sections.push({ title: label(key), rows });
    }
  });

  return sections;
}

export default function AdminScreen({ navigation }: any) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const raw = await getAdminStats();
      const data = raw?.stats ?? raw;
      setSections(toSections(data));
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError("Acesso restrito a administradores.");
      } else {
        setError("Não foi possível carregar as estatísticas.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      load();
    } else {
      setLoading(false);
    }
  }, [load, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Painel do Admin</Text>

      <TouchableOpacity
        style={styles.reportsButton}
        onPress={() => navigation.navigate("AdminReports")}
      >
        <Text style={styles.reportsButtonText}>Ver denúncias</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!error && sections.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma estatística disponível.</Text>
      ) : null}

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.grid}>
            {section.rows.map((row) => (
              <View key={row.key} style={styles.card}>
                <Text style={styles.cardValue}>{row.value}</Text>
                <Text style={styles.cardLabel}>{row.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: { fontSize: 24, fontWeight: "bold", color: GREEN, marginBottom: 12 },
  reportsButton: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  reportsButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  deniedText: { fontSize: 16, color: "#666", textAlign: "center" },
  errorText: { color: "red", marginBottom: 12 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  card: {
    width: "47%",
    margin: "1.5%",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "#F6FAF6",
  },
  cardValue: { fontSize: 24, fontWeight: "bold", color: GREEN },
  cardLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
});
