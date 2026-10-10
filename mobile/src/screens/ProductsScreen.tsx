import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import { getFavorites, addFavorite, removeFavorite } from "../api/favorites";
import { fetchProducts } from "../api/products";
import { createOrder } from "../api/orders";
import { getPublicStore } from "../api/merchant";
import { getApiErrorMessage } from "../api/errorMessage";
import { DEPARTMENTS, departmentOf, departmentLabel, ESTADOS, money } from "../constants/market";
import { Btn, Chip, Field, Badge } from "../components/ui";
import ReportButton from "../components/ReportButton";

const CATEGORY_TO_DEPARTMENT: Record<string, string> = {
  AGRICOLA: "AGRICULTURA",
  PESCA: "PESCA",
  ARTESANATO: "ARTESANATO",
  OUTRO: "OUTROS",
};

const SORTS = [
  { value: "", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "best_selling", label: "Mais vendidos" },
];

const RATINGS = [
  { value: "", label: "Qualquer" },
  { value: "3", label: "3★ ou mais" },
  { value: "4", label: "4★ ou mais" },
  { value: "5", label: "5★" },
];

const DELIVERY_CHOICES = ["Recolha na loja", "Entrega ao domicílio"];

export default function ProductsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [draft, setDraft] = useState({ minPrice: "", maxPrice: "", location: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [buying, setBuying] = useState<any | null>(null);
  const [qty, setQty] = useState("1");
  const [delivery, setDelivery] = useState(DELIVERY_CHOICES[0]);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [store, setStore] = useState<any | null>(null);

  const subcategories = departmentOf(filters.department)?.subcategories ?? [];

  function setFilter(key: string, value: any) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const load = useCallback(async () => {
    try {
      setError("");
      setProducts(await fetchProducts(filters));
    } catch (e) {
      setError(t("loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, t]);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(favs.map((f: any) => f.productId));
    } catch (e) {
      console.log("Erro ao carregar favoritos", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  async function toggleFavorite(productId: string) {
    const isFav = favoriteIds.includes(productId);
    try {
      if (isFav) {
        await removeFavorite(productId);
        setFavoriteIds((prev) => prev.filter((id) => id !== productId));
      } else {
        await addFavorite(productId);
        setFavoriteIds((prev) => [...prev, productId]);
      }
    } catch (e) {
      console.log("Erro ao favoritar", e);
    }
  }

  function applyDraft() {
    setFilters((prev) => ({
      ...prev,
      minPrice: draft.minPrice.trim(),
      maxPrice: draft.maxPrice.trim(),
      location: draft.location.trim(),
    }));
  }

  function clearFilters() {
    setDraft({ minPrice: "", maxPrice: "", location: "" });
    setText("");
    setFilters({});
  }

  function openBuy(product: any) {
    setBuying(product);
    setQty("1");
    setDelivery(DELIVERY_CHOICES[0]);
    setAddress("");
    setNotes("");
  }

  async function confirmOrder() {
    if (!buying) return;
    const quantity = parseInt(qty, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > buying.quantity) {
      Alert.alert("Atenção", `Escolha uma quantidade de 1 a ${buying.quantity}.`);
      return;
    }
    if (delivery === DELIVERY_CHOICES[1] && !address.trim()) {
      Alert.alert("Atenção", "Escreva o endereço de entrega.");
      return;
    }

    setOrdering(true);
    try {
      await createOrder({
        items: [{ productId: buying.id, quantity }],
        deliveryOption: delivery,
        deliveryAddress: delivery === DELIVERY_CHOICES[1] ? address.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      setBuying(null);
      Alert.alert("Pedido enviado", "O vendedor vai responder em breve. Veja as mensagens para combinar.");
      load();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível enviar o pedido."));
    } finally {
      setOrdering(false);
    }
  }

  async function openStore(ownerId: string) {
    setStore({ loading: true });
    try {
      setStore(await getPublicStore(ownerId));
    } catch (e) {
      setStore(null);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível abrir a loja."));
    }
  }

  const unitPrice = buying ? buying.finalPrice ?? buying.price : 0;
  const total = unitPrice * (parseInt(qty, 10) || 0);

  const header = (
    <View>
      <Text style={s.title}>{t("productsTitle")}</Text>

      <Field
        placeholder={t("searchProduct")}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setFilter("q", text.trim())}
        returnKeyType="search"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <Chip label="Todos" active={!filters.department} onPress={() => setFilters((p) => ({ ...p, department: "", subcategory: "" }))} />
        {DEPARTMENTS.map((d) => (
          <Chip
            key={d.value}
            label={`${d.icon} ${d.label}`}
            active={filters.department === d.value}
            onPress={() => setFilters((p) => ({ ...p, department: d.value, subcategory: "" }))}
          />
        ))}
      </ScrollView>

      {subcategories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {subcategories.map((sub) => (
            <Chip key={sub} label={sub} active={filters.subcategory === sub} onPress={() => setFilter("subcategory", filters.subcategory === sub ? "" : sub)} />
          ))}
        </ScrollView>
      )}

      <View style={s.row}>
        <Btn small kind="outline" label={showFilters ? "Esconder filtros" : "⚙️ Filtros"} onPress={() => setShowFilters(!showFilters)} />
        <Btn small kind="outline" label="Limpar" onPress={clearFilters} />
      </View>

      {showFilters && (
        <View style={s.filters}>
          <Text style={s.label}>Estado</Text>
          <View style={s.row}>
            <Chip label="Qualquer" active={!filters.estado} onPress={() => setFilter("estado", "")} />
            {ESTADOS.map((e) => (
              <Chip key={e.value} label={`Produtos ${e.label.toLowerCase()}s`} active={filters.estado === e.value} onPress={() => setFilter("estado", e.value)} />
            ))}
          </View>

          <Text style={s.label}>Avaliação do vendedor</Text>
          <View style={s.row}>
            {RATINGS.map((r) => (
              <Chip key={r.label} label={r.label} active={(filters.minRating ?? "") === r.value} onPress={() => setFilter("minRating", r.value)} />
            ))}
          </View>

          <Text style={s.label}>Ordenar por</Text>
          <View style={s.row}>
            {SORTS.map((o) => (
              <Chip key={o.label} label={o.label} active={(filters.sort ?? "") === o.value} onPress={() => setFilter("sort", o.value)} />
            ))}
          </View>

          <Field label="Preço mínimo (FCFA)" value={draft.minPrice} onChangeText={(v) => setDraft({ ...draft, minPrice: v })} keyboardType="numeric" />
          <Field label="Preço máximo (FCFA)" value={draft.maxPrice} onChangeText={(v) => setDraft({ ...draft, maxPrice: v })} keyboardType="numeric" />
          <Field label="Localização" value={draft.location} onChangeText={(v) => setDraft({ ...draft, location: v })} placeholder="Ex: Bissau" />
          <Btn label="Aplicar filtros" onPress={applyDraft} />
        </View>
      )}

      <Btn label={t("addProduct")} onPress={() => navigation.navigate("AddProduct")} />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
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
        data={products}
        keyExtractor={(item, index) => String(item.id ?? index)}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={<Text style={s.empty}>{t("noProducts")}</Text>}
        renderItem={({ item }) => {
          const mine = item.ownerId === user?.id;
          const details = item.details ?? {};
          const dept = item.department ?? CATEGORY_TO_DEPARTMENT[item.category];
          return (
            <View style={s.card}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.image} resizeMode="cover" /> : null}

              <View style={s.between}>
                <Text style={s.name}>{item.title}</Text>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                  <Text style={{ fontSize: 20 }}>{favoriteIds.includes(item.id) ? "❤️" : "🤍"}</Text>
                </TouchableOpacity>
              </View>

              {item.promotion ? (
                <View style={s.row}>
                  <Text style={[s.price, { textDecorationLine: "line-through", color: colors.textSecondary }]}>{money(item.price)}</Text>
                  <Text style={s.price}> {money(item.finalPrice)} / {item.unit}</Text>
                  <View style={{ marginLeft: 8 }}>
                    <Badge label={item.promotion.discountPercent ? `-${item.promotion.discountPercent}%` : item.promotion.title} color="#C62828" />
                  </View>
                </View>
              ) : (
                <Text style={s.price}>
                  {money(item.price)} / {item.unit}
                </Text>
              )}

              <Text style={s.meta}>
                {departmentLabel(dept)}
                {item.subcategory ? ` · ${item.subcategory}` : ""}
              </Text>
              {details.estado ? <Text style={s.meta}>Estado: {details.estado === "NOVO" ? "Novo" : "Usado"}</Text> : null}
              {details.brand || details.model ? (
                <Text style={s.meta}>
                  {[details.brand, details.model].filter(Boolean).join(" ")}
                </Text>
              ) : null}
              {details.color || details.size ? <Text style={s.meta}>{[details.color, details.size].filter(Boolean).join(" · ")}</Text> : null}
              {item.location ? <Text style={s.meta}>📍 {item.location}</Text> : null}
              <Text style={s.meta}>
                {item.owner?.name ?? t("seller")} {item.owner?.isVerified ? "✅" : ""} · {item.quantity} em estoque
              </Text>
              {details.deliveryOptions ? <Text style={s.meta}>🚚 {details.deliveryOptions}</Text> : null}
              {details.saleConditions ? <Text style={s.meta}>📄 {details.saleConditions}</Text> : null}

              <View style={s.row}>
                {!mine && item.quantity > 0 ? <Btn small label="🛒 Comprar" onPress={() => openBuy(item)} /> : null}
                {!mine ? (
                  <Btn
                    small
                    kind="outline"
                    label={t("contactSeller")}
                    onPress={() => navigation.navigate("Chat", { userId: item.ownerId, userName: item.owner?.name ?? t("seller") })}
                  />
                ) : null}
                <Btn small kind="outline" label="🏪 Loja" onPress={() => openStore(item.ownerId)} />
                <Btn
                  small
                  kind="outline"
                  label={t("reviews")}
                  onPress={() =>
                    navigation.navigate("Reviews", { userId: item.ownerId, userName: item.owner?.name ?? t("seller"), productId: item.id })
                  }
                />
                {item.videoUrl ? <Btn small kind="outline" label="🎥 Ver vídeo" onPress={() => Linking.openURL(item.videoUrl)} /> : null}
              </View>

              <ReportButton productId={item.id} ownerId={item.ownerId} />
            </View>
          );
        }}
      />

      <Modal visible={!!buying} animationType="slide" onRequestClose={() => setBuying(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <Text style={s.title}>🛒 Comprar</Text>
            {buying ? (
              <>
                <Text style={s.name}>{buying.title}</Text>
                <Text style={s.price}>
                  {money(unitPrice)} / {buying.unit}
                </Text>

                <Field label={`Quantidade (máx. ${buying.quantity})`} value={qty} onChangeText={setQty} keyboardType="numeric" />

                <Text style={s.label}>Entrega</Text>
                <View style={s.row}>
                  {DELIVERY_CHOICES.map((choice) => (
                    <Chip key={choice} label={choice} active={delivery === choice} onPress={() => setDelivery(choice)} />
                  ))}
                </View>

                {delivery === DELIVERY_CHOICES[1] ? (
                  <Field label="Endereço de entrega" value={address} onChangeText={setAddress} multiline />
                ) : null}
                <Field label="Nota para o vendedor (opcional)" value={notes} onChangeText={setNotes} multiline />

                <Text style={[s.name, { marginTop: 14 }]}>Total: {money(total)}</Text>

                <View style={s.row}>
                  <Btn label={ordering ? "A enviar..." : "Confirmar pedido"} onPress={confirmOrder} disabled={ordering} />
                  <Btn kind="outline" label="Fechar" onPress={() => setBuying(null)} />
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={!!store} animationType="slide" onRequestClose={() => setStore(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 8 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {store && store.loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : store ? (
              <>
                <Text style={s.title}>🏪 {store.store?.name ?? store.owner?.name ?? "Loja"}</Text>
                {store.store?.logoUrl ? <Image source={{ uri: store.store.logoUrl }} style={{ width: 90, height: 90, borderRadius: 10, marginBottom: 10 }} /> : null}
                {store.owner?.isVerified ? <Badge label="Comerciante verificado ✅" color="#2E7D32" /> : null}
                {store.store?.description ? <Text style={[s.meta, { marginTop: 10 }]}>{store.store.description}</Text> : null}
                {store.store?.location ? <Text style={s.meta}>📍 {store.store.location}</Text> : null}
                {store.store?.contact ? <Text style={s.meta}>📞 {store.store.contact}</Text> : null}
                {store.store?.openingHours ? <Text style={s.meta}>🕒 {store.store.openingHours}</Text> : null}
                <Text style={s.meta}>
                  ⭐ {Number(store.rating?.average ?? 0).toFixed(1)} ({store.rating?.count ?? 0} avaliações) · {store.products} produtos
                </Text>
                {(store.store?.photoUrls ?? []).map((url: string) => (
                  <Image key={url} source={{ uri: url }} style={{ width: "100%", height: 160, borderRadius: 8, marginTop: 10 }} />
                ))}
              </>
            ) : null}
            <Btn kind="outline" label="Fechar" onPress={() => setStore(null)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: "bold", color: colors.primary, marginVertical: 12 },
  error: { color: "#B71C1C", textAlign: "center", marginVertical: 8 },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  filters: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12 },
  image: { width: "100%", height: 180, borderRadius: 8, marginBottom: 10, backgroundColor: "#f0f0f0" },
  name: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  price: { fontSize: 15, color: colors.primary, marginTop: 4, fontWeight: "600" },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
});
