import React, { useCallback, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getConversations } from "../api/messages";
import { colors } from "../theme/colors";

interface Conversa {
  key: string;
  otherId: string;
  otherName: string;
  productTitle?: string;
  last: string;
  createdAt: string;
  mine: boolean;
}

// Mensagens de foto, vídeo e áudio mostram um texto curto em vez do link
function resumo(content: string): string {
  const text = String(content || "");
  if (text.startsWith("📷 Foto")) return "📷 Foto";
  if (text.startsWith("🎬 Vídeo")) return "🎬 Vídeo";
  if (text.startsWith("🎤 Áudio")) return "🎤 Áudio";
  return text;
}

function quando(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  if (mesmoDia) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function iniciais(name: string): string {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

export default function ConversationsScreen({ navigation }: any) {
  const { user } = useAuth() as any;
  const { t } = useLanguage();

  const [items, setItems] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getConversations();
      const list: any[] = Array.isArray(data) ? data : [];
      const myId = String(user?.id);

      const mapped: Conversa[] = list.map((m) => {
        const mine = String(m.senderId) === myId;
        const other = mine ? m.receiver : m.sender;
        return {
          key: String(m.id),
          otherId: String(mine ? m.receiverId : m.senderId),
          otherName: other?.name ?? "—",
          productTitle: m.product?.title,
          last: resumo(m.content),
          createdAt: m.createdAt,
          mine,
        };
      });

      mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(mapped);
    } catch (e) {
      setError(t("conversationsError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        keyExtractor={(c) => c.key}
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
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name={error ? "cloud-offline-outline" : "chatbubbles-outline"} size={38} color={colors.primary} />
            </View>
            <Text style={s.emptyText}>{error || t("noConversations")}</Text>
            {error ? (
              <TouchableOpacity style={s.retry} onPress={load}>
                <Text style={s.retryText}>Tentar de novo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Chat", { userId: item.otherId, userName: item.otherName })}
          >
            <View style={s.avatar}>
              <Text style={s.avatarText}>{iniciais(item.otherName)}</Text>
            </View>
            <View style={s.info}>
              <View style={s.topLine}>
                <Text style={s.name} numberOfLines={1}>
                  {item.otherName}
                </Text>
                <Text style={s.time}>{quando(item.createdAt)}</Text>
              </View>
              {item.productTitle ? (
                <View style={s.productTag}>
                  <Ionicons name="pricetag-outline" size={12} color={colors.primary} />
                  <Text style={s.productText} numberOfLines={1}>
                    {item.productTitle}
                  </Text>
                </View>
              ) : null}
              <Text style={s.last} numberOfLines={1}>
                {item.mine ? "Você: " : ""}
                {item.last}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginVertical: 5,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  info: { flex: 1 },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, marginRight: 8 },
  time: { fontSize: 12, color: colors.muted },
  productTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
  },
  productText: { fontSize: 11, color: colors.primary, fontWeight: "700", marginLeft: 4, maxWidth: 200 },
  last: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
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
