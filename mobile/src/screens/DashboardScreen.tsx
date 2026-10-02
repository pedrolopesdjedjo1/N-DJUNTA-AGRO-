import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  getOverview,
  getGrowth,
  dashboardErrorMessage,
  Overview,
  GrowthItem,
} from "../api/dashboard";

type BarItem = { label: string; value: number };

function BarList({ title, data }: { title: string; data: BarItem[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length === 0 ? (
        <Text style={styles.empty}>Sem dados ainda.</Text>
      ) : (
        data.map((item) => (
          <View key={item.label} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max((item.value / max) * 100, 4)}%` },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{item.value}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [growth, setGrowth] = useState<GrowthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [ov, gr] = await Promise.all([getOverview(), getGrowth()]);
      setOverview(ov);
      setGrowth(gr);
    } catch (err: any) {
      setError(dashboardErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  if (error || !overview) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Sem dados."}</Text>
      </View>
    );
  }

  const usersByRole: BarItem[] = (overview.usersByRole || []).map((i) => ({
    label: i.role,
    value: i._count?.role ?? 0,
  }));

  const productsByCategory: BarItem[] = (overview.productsByCategory || []).map(
    (i) => ({
      label: i.category || "Sem categoria",
      value: i._count?.category ?? 0,
    })
  );

  const productsByLocation: BarItem[] = (overview.productsByLocation || []).map(
    (i) => ({
      label: i.location || "Sem local",
      value: i._count?.location ?? 0,
    })
  );

  const growthItems: BarItem[] = growth.map((g) => ({
    label: g.month,
    value: g.newUsers,
  }));

  const totalUsers = usersByRole.reduce((sum, i) => sum + i.value, 0);
  const totalProducts = productsByCategory.reduce((sum, i) => sum + i.value, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{totalUsers}</Text>
          <Text style={styles.cardLabel}>Usuários</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{totalProducts}</Text>
          <Text style={styles.cardLabel}>Produtos</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>
            {overview.totalConfirmedTransactions ?? 0}
          </Text>
          <Text style={styles.cardLabel}>Transações</Text>
        </View>
      </View>

      <BarList title="Usuários por perfil" data={usersByRole} />
      <BarList title="Produtos por categoria" data={productsByCategory} />
      <BarList title="Produtos por local" data={productsByLocation} />
      <BarList title="Novos usuários por mês" data={growthItems} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { color: "#B71C1C", textAlign: "center", fontSize: 15 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B5E20", marginBottom: 16 },
  cardsRow: { flexDirection: "row", marginBottom: 8 },
  card: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  cardValue: { fontSize: 24, fontWeight: "bold", color: "#1B5E20" },
  cardLabel: { fontSize: 12, color: "#444", marginTop: 4 },
  section: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#111", marginBottom: 10 },
  empty: { color: "#888", fontSize: 13 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  barLabel: { width: 100, fontSize: 12, color: "#333" },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "#f0f0f0",
    borderRadius: 7,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  barFill: { height: 14, backgroundColor: "#1B5E20", borderRadius: 7 },
  barValue: { width: 32, textAlign: "right", fontSize: 13, fontWeight: "600", color: "#111" },
});
