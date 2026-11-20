import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { fetchProducts } from "../api/products";
import { useFavoriteIds } from "../utils/favorites";
import BuyModal from "../components/BuyModal";
import { DEPARTMENTS, departmentLabel, money } from "../constants/market";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function ProductsScreen({ navigation, route }: any) {
  const { user } = useAuth() as any;
  const { ids, toggle } = useFavoriteIds();

  const [q, setQ] = useState<string>(route?.params?.q ?? "");
  const [department, setDepartment] = useState<string>(route?.params?.department ?? "");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState<any | null>(null);
  const first = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const list = await fetchProducts({ q: q.trim() || undefined, department: department || undefined });
        setItems(list);
      } catch (e) {
        setError(getApiErrorMessage(e, "Não foi possível carregar os produtos."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [q, department]
  );

  // Recarrega quando o departamento muda e sempre que a tela volta a aparecer
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    load();
  }, [department]);

  useFocusEffect(
    useCallback(() => {
      load(!first.current && items.length > 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function renderItem({ item: p }: { item: any }) {
    const mine = p.owner?.id === user?.id || p.ownerId === user?.id;
    const price = p.finalPrice ?? p.price;
    const hasRating = p.rating && p.rating.count > 0;
    const sold = p.isAvailable === false || p.quantity === 0;

    return (
      <View style={s.card}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate("ClientProduct", { id: p.id })}>
          <View>
            {p.imageUrl ? (
              <Image source={{ uri: p.imageUrl }} style={s.photo} resizeMode="cover" />
            ) : (
              <View style={[s.photo, s.photoEmpty]}>
                <Ionicons name="image-outline" size={40} color={colors.muted} />
              </View>
            )}
            <TouchableOpacity style={s.heart} onPress={() => toggle(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={ids.has(p.id) ? "heart" : "heart-outline"} size={22} color={ids.has(p.id) ? colors.error : colors.text} />
            </TouchableOpacity>
            {sold ? (
              <View style={s.soldTag}>
                <Text style={s.soldText}>Esgotado</Text>
              </View>
            ) : null}
          </View>

          <View style={s.body}>
            <Text style={s.dep}>{departmentLabel(p.department)}</Text>
            <Text style={s.title} numberOfLines={2}>
              {p.title}
            </Text>
            <Text style={s.price}>
              {money(price)}
              {p.unit ? <Text style={s.unit}> / {p.unit}</Text> : null}
            </Text>
            <View style={s.metaRow}>
              {p.location ? (
                <View style={s.meta}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.metaText}>{p.location}</Text>
                </View>
              ) : null}
              {p.owner?.name ? (
                <View style={s.meta}>
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.metaText}>{p.owner.name}</Text>
                </View>
              ) : null}
              {hasRating ? (
                <View style={s.meta}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={s.metaText}>{Number(p.rating.average).toFixed(1)} ({p.rating.count})</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        <View style={s.actions}>
          {mine ? (
            <TouchableOpacity style={[s.btn, s.btnOutline, { flex: 1 }]} onPress={() => navigation.navigate("AddProduct", { product: p })}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={s.btnOutlineText}>Editar o meu produto</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[s.btn, s.btnGold, sold && s.btnOff]} disabled={sold} onPress={() => setBuying(p)}>
                <Ionicons name="bag-handle-outline" size={18} color={colors.black} />
                <Text style={s.btnGoldText}>Comprar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary]}
                onPress={() => navigation.navigate("Chat", { userId: p.owner?.id ?? p.ownerId, userName: p.owner?.name })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
                <Text style={s.btnPrimaryText}>Falar com vendedor</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={s.links}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Reviews", { userId: p.owner?.id ?? p.ownerId, userName: p.owner?.name, productId: p.id })}
          >
            <Text style={s.link}>Ver avaliações</Text>
          </TouchableOpacity>
          {!mine ? (
            <TouchableOpacity onPress={() => navigation.navigate("ReportCreate", { targetType: "PRODUCT", targetId: p.id })}>
              <Text style={[s.link, { color: colors.error }]}>Denunciar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={s.flex}>
      {/* Pesquisa */}
      <View style={s.searchBox}>
        <View style={s.search}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Pesquisar produtos…"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
            onSubmitEditing={() => load()}
          />
          {q ? (
            <TouchableOpacity
              onPress={() => {
                setQ("");
                setTimeout(() => load(), 0);
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <TouchableOpacity style={[s.chip, !department && s.chipOn]} onPress={() => setDepartment("")}>
            <Text style={[s.chipText, !department && s.chipTextOn]}>Todos</Text>
          </TouchableOpacity>
          {DEPARTMENTS.map((d) => (
            <TouchableOpacity key={d.value} style={[s.chip, department === d.value && s.chipOn]} onPress={() => setDepartment(department === d.value ? "" : d.value)}>
              <Text style={[s.chipText, department === d.value && s.chipTextOn]}>
                {d.icon} {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name={error ? "cloud-offline-outline" : "basket-outline"} size={52} color={colors.muted} />
              <Text style={s.emptyText}>{error || "Nenhum produto encontrado."}</Text>
              {error ? (
                <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 14 }]} onPress={() => load()}>
                  <Text style={s.btnPrimaryText}>Tentar de novo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      <BuyModal
        product={buying}
        onClose={() => setBuying(null)}
        onDone={() => {
          setBuying(null);
          load(true);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchBox: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 15, color: colors.text },
  chip: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: colors.black, fontWeight: "800" },
  list: { padding: 14, paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  photo: { width: "100%", height: 190, backgroundColor: colors.cream },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  soldTag: { position: "absolute", left: 10, top: 10, backgroundColor: colors.black, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  soldText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  body: { padding: 14, paddingBottom: 8 },
  dep: { fontSize: 12, color: colors.primary, fontWeight: "700", marginBottom: 4 },
  title: { fontSize: 17, fontWeight: "800", color: colors.text },
  price: { fontSize: 20, fontWeight: "900", color: colors.primaryDark, marginTop: 6 },
  unit: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  meta: { flexDirection: "row", alignItems: "center", marginRight: 14, marginBottom: 2 },
  metaText: { fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
  actions: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 6 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  btnOff: { opacity: 0.4 },
  btnGold: { backgroundColor: colors.gold },
  btnGoldText: { color: colors.black, fontWeight: "800", fontSize: 14, marginLeft: 6 },
  btnPrimary: { backgroundColor: colors.primary, flex: 1, marginRight: 0 },
  btnPrimaryText: { color: colors.white, fontWeight: "800", fontSize: 14, marginLeft: 6 },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primarySoft, marginRight: 0 },
  btnOutlineText: { color: colors.primary, fontWeight: "800", fontSize: 14, marginLeft: 6 },
  links: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 30 },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: "center", marginTop: 12 },
});
