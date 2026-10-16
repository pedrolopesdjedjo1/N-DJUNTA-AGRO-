import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { ClientLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ClientProductCard from "../components/ClientProductCard";
import { useFavoriteIds } from "../utils/favorites";
import { searchShop, getShopCategories } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";

const SORTS = [
  { value: "recent", label: "Mais recentes" },
  { value: "sold", label: "Mais vendidos" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "rating", label: "Melhor avaliação" },
];

const RATINGS = [
  { value: 0, label: "Qualquer avaliação" },
  { value: 3, label: "3★ ou mais" },
  { value: 4, label: "4★ ou mais" },
];

const PAGE_SIZE = 20;

export default function ClientExploreScreen({ navigation, route }: any) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 42) / 2);
  const { ids, toggle } = useFavoriteIds();
  const catLoader = useLoader(() => getShopCategories(), { categories: [] as any[], region: "" });

  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [near, setNear] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const [showFilters, setShowFilters] = useState(false);
  const [minPriceText, setMinPriceText] = useState("");
  const [maxPriceText, setMaxPriceText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [applied, setApplied] = useState({ minPrice: "", maxPrice: "", location: "" });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  // Quando chega de outra tela (categoria, pesquisa, promoções...), aplica o que foi pedido
  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    setCategory(p.category ?? "");
    setQ(p.q ?? "");
    setText(p.q ?? "");
    setSort(p.sort ?? "recent");
    setOnlyPromo(!!p.onlyPromo);
    setNear(!!p.near);
  }, [route?.params]);

  const key = JSON.stringify({ q, category, sort, onlyPromo, near, minRating, applied });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const result = await searchShop({
        q,
        category,
        sort,
        onlyPromo,
        near,
        minRating: minRating || undefined,
        minPrice: applied.minPrice || undefined,
        maxPrice: applied.maxPrice || undefined,
        location: applied.location || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
      setTotal(result.total);
      setPage(nextPage);
      setRegion(result.region ?? "");
    } catch (e) {
      if (mine === requestId.current) {
        setError(getApiErrorMessage(e, "Não foi possível carregar os produtos."));
      }
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function applyFilters() {
    setApplied({
      minPrice: minPriceText.replace(/[^\d]/g, ""),
      maxPrice: maxPriceText.replace(/[^\d]/g, ""),
      location: locationText.trim(),
    });
  }

  function clearFilters() {
    setMinPriceText("");
    setMaxPriceText("");
    setLocationText("");
    setApplied({ minPrice: "", maxPrice: "", location: "" });
    setMinRating(0);
    setOnlyPromo(false);
    setNear(false);
    setCategory("");
    setQ("");
    setText("");
    setSort("recent");
  }

  const activeFilters =
    (category ? 1 : 0) +
    (onlyPromo ? 1 : 0) +
    (near ? 1 : 0) +
    (minRating ? 1 : 0) +
    (applied.minPrice ? 1 : 0) +
    (applied.maxPrice ? 1 : 0) +
    (applied.location ? 1 : 0);

  const categories: any[] = catLoader.data.categories;

  return (
    <ClientLayout active="ClientExplore">
      <Page>
        <Title>🔎 Explorar</Title>

        <Field
          placeholder="Pesquisar por nome, categoria ou vendedor"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <Chip label="Todos" active={category === ""} onPress={() => setCategory("")} />
          {categories.map((c) => (
            <Chip
              key={c.key}
              label={`${c.icon} ${c.label}`}
              active={category === c.key}
              onPress={() => setCategory(category === c.key ? "" : c.key)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SORTS.map((s) => (
            <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
          ))}
        </ScrollView>

        <View style={u.row}>
          <Btn
            small
            kind="outline"
            label={showFilters ? "Fechar filtros" : `⚙️ Filtros${activeFilters ? ` (${activeFilters})` : ""}`}
            onPress={() => setShowFilters(!showFilters)}
          />
          {activeFilters > 0 || q ? <Btn small kind="outline" label="Limpar tudo" onPress={clearFilters} /> : null}
        </View>

        {showFilters && (
          <Card>
            <Text style={u.label}>Preço (FCFA)</Text>
            <View style={u.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field placeholder="Mínimo" value={minPriceText} onChangeText={setMinPriceText} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field placeholder="Máximo" value={maxPriceText} onChangeText={setMaxPriceText} keyboardType="numeric" />
              </View>
            </View>

            <Field label="Localização do produto" placeholder="Ex: Bissau, Bafatá" value={locationText} onChangeText={setLocationText} />
            <Btn small label="Aplicar" onPress={applyFilters} />

            <Text style={[u.label, { marginTop: 12 }]}>Avaliação do vendedor</Text>
            <View style={u.row}>
              {RATINGS.map((r) => (
                <Chip key={r.value} label={r.label} active={minRating === r.value} onPress={() => setMinRating(r.value)} />
              ))}
            </View>

            <Text style={[u.label, { marginTop: 12 }]}>Mais opções</Text>
            <View style={u.row}>
              <Chip label="📍 Perto de mim" active={near} onPress={() => setNear(!near)} />
              <Chip label="🔥 Só promoções" active={onlyPromo} onPress={() => setOnlyPromo(!onlyPromo)} />
            </View>
            <Text style={[u.muted, { marginTop: 6 }]}>
              Perto de mim mostra produtos da sua região (a do seu endereço principal).
            </Text>
          </Card>
        )}

        {near && !region ? (
          <Card>
            <Text style={u.muted}>Defina a sua localização para ver produtos perto de si.</Text>
            <Btn small label="Definir localização" onPress={() => navigation.navigate("ClientAddresses")} />
          </Card>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>
          {busy && items.length === 0 ? "A carregar..." : `${total} produto(s) encontrado(s)`}
        </Text>

        {error ? <Empty text={error} /> : null}

        {!busy && !error && items.length === 0 ? <Empty text="Nenhum produto encontrado. Tente outra pesquisa ou limpe os filtros." /> : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 }}>
          {items.map((p) => (
            <ClientProductCard
              key={p.id}
              product={p}
              width={cardWidth}
              favorite={ids.has(p.id)}
              onToggleFavorite={() => toggle(p.id)}
              onPress={() => navigation.navigate("ClientProduct", { id: p.id })}
            />
          ))}
        </View>

        {items.length < total ? (
          <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais produtos"} onPress={() => load(false)} disabled={busy} />
        ) : null}
      </Page>
    </ClientLayout>
  );
}
