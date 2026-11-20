import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { getNotifications, markAsRead } from "../api/notifications";
import { colors } from "../theme/colors";

interface Notificacao {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TIPOS: Record<string, { icon: any; cor: string; fundo: string }> = {
  MENSAGEM: { icon: "chatbubble-ellipses", cor: colors.primary, fundo: colors.primarySoft },
  AVALIACAO: { icon: "star", cor: colors.gold, fundo: colors.goldSoft },
  PRODUTO: { icon: "pricetag", cor: colors.primaryDark, fundo: colors.primarySoft },
  SISTEMA: { icon: "megaphone", cor: colors.black, fundo: colors.goldSoft },
};

function quando(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const minutos = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias} d`;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unread = items.filter((n) => !n.isRead).length;

  async function readAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch("/api/notifications/read-all");
    } catch (e) {
      load();
    }
  }

  // Botão "Ler todas" no cabeçalho
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unread > 0 ? (
          <TouchableOpacity onPress={readAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.headerBtn}>Ler todas</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, unread]);

  async function open(n: Notificacao) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      markAsRead(n.id).catch(() => {});
    }
    // Mensagem nova: abre a lista de conversas
    if (n.type === "MENSAGEM") navigation.navigate("Conversations");
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          unread > 0 ? (
            <View style={s.banner}>
              <Ionicons name="notifications" size={18} color={colors.primaryDark} />
              <Text style={s.bannerText}>
                {unread === 1 ? "1 notificação nova" : `${unread} notificações novas`}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name={error ? "cloud-offline-outline" : "notifications-off-outline"} size={38} color={colors.primary} />
            </View>
            <Text style={s.emptyText}>{error || "Ainda não tem notificações."}</Text>
            {error ? (
              <TouchableOpacity style={s.retry} onPress={load}>
                <Text style={s.retryText}>Tentar de novo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const tipo = TIPOS[item.type] ?? TIPOS.SISTEMA;
          return (
            <TouchableOpacity
              style={[s.row, !item.isRead && s.rowNew]}
              activeOpacity={0.85}
              onPress={() => open(item)}
            >
              <View style={[s.icon, { backgroundColor: tipo.fundo }]}>
                <Ionicons name={tipo.icon} size={20} color={tipo.cor} />
              </View>
              <View style={s.info}>
                <View style={s.topLine}>
                  <Text style={[s.title, !item.isRead && s.titleNew]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.isRead ? <View style={s.dot} /> : null}
                </View>
                <Text style={s.message} numberOfLines={3}>
                  {item.message}
                </Text>
                <Text style={s.time}>{quando(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  headerBtn: { color: colors.white, fontWeight: "800", fontSize: 14 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.goldSoft,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  bannerText: { marginLeft: 8, color: colors.black, fontWeight: "700", fontSize: 14 },
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginVertical: 5,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowNew: { borderColor: colors.primaryLight, backgroundColor: "#F6FBF7" },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: { flex: 1 },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text, marginRight: 8 },
  titleNew: { fontWeight: "800" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  message: { fontSize: 14, color: colors.textSecondary, marginTop: 3 },
  time: { fontSize: 12, color: colors.muted, marginTop: 6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingVertical: 80 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: "center" },
  retry: { marginTop: 14, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: colors.white, fontWeight: "800" },
});
