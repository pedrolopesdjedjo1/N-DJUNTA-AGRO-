import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ProductCard from "../components/agent/ProductCard";
import { listAgentMarket, getClientProducts, getAgentClient } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { DEPARTMENT_LABEL } from "../constants/agentOps";
import { getApiErrorMessage } from "../api/errorMessage";

const AVAILABILITY = [
  { value: "available", label: "Disponíveis" },
  { value: "unavailable", label: "Indisponíveis" },
  { value: "low", label: "A acabar" },
];

// Mercado: todos os produtos à venda, com filtros, e os produtos dos clientes do agente
export default function AgentMarketScreen({ navigation, route }: any) {
  const catalog = useAgentCatalog();

  const [linkId, setLinkId] = useState<string>(route?.params?.linkId ?? "");
  const [tab, setTab] = useState<"all" | "mine">(route?.params?.scope === "mine" || route?.params?.linkId ? "mine" : "all");
  const [clientName, setClientName] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("");
  const [availability, setAvailability] = useState("");
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [prices, setPrices] = useState({ min: "", max: "" });
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ total: 0, available: 0, unavailable: 0, lowStock: 0 });
  const [byDepartment, setByDepartment] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    setLinkId(p.linkId ?? "");
    if (p.linkId || p.scope === "mine") setTab("mine");
  }, [route?.params]);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setClientName("");
    if (linkId) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
  }, [linkId]);

  const key = JSON.stringify({ tab, linkId, q, department, region, sort, availability, prices });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      if (linkId) {
        const r = await getClientProducts(linkId);
        if (mine !== requestId.current) return;

        const needle = q.toLowerCase();
        let list: any[] = r.items;
        if (needle) list = list.filter((p) => `${p.title} ${p.subcategory ?? ""}`.toLowerCase().includes(needle));
        if (availability === "available") list = list.filter((p) => p.isAvailable);
        if (availability === "unavailable") list = list.filter((p) => !p.isAvailable);
        if (availability === "low") list = list.filter((p) => p.lowStock);

        setItems(list);
        setTotal(list.length);
        setSummary({ ...r.summary });
        setByDepartment({});
        setPage(1);
      } else {
        const r = await listAgentMarket({
          q,
          department,
          region,
          sort,
          scope: tab === "mine" ? "mine" : "",
          availability: tab === "mine" ? availability : "",
          minPrice: prices.min,
          maxPrice: prices.max,
          page: nextPage,
        });
        if (mine !== requestId.current) return;

        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setSummary(r.summary);
        setByDepartment(r.byDepartment);
        setPage(nextPage);
      }
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os produtos."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  function applyPrices() {
    const clean = (v: string) => v.replace(/[^\d.,]/g, "").replace(",", ".");
    setPrices({ min: clean(minText), max: clean(maxText) });
  }

  const departmentOptions = Object.keys(byDepartment).map((d) => ({
    value: d,
    label: `${DEPARTMENT_LABEL[d] ?? d} (${byDepartment[d]})`,
  }));
  const hasFilters = !!(q || department || region || sort || availability || prices.min || prices.max);

  function clearFilters() {
    setText("");
    setQ("");
    setDepartment("");
    setRegion("");
    setSort("");
    setAvailability("");
    setMinText("");
    setMaxText("");
    setPrices({ min: "", max: "" });
  }

  return (
    <AgentLayout active="AgentMarket">
      <Page>
        <Title>🛒 Mercado</Title>
        <Text style={u.muted}>Veja os produtos à venda, ajude clientes a encontrar o que precisam e acompanhe a disponibilidade dos produtos dos seus clientes.</Text>

        {linkId ? (
          <Card>
            <Text style={u.strong}>👤 Produtos de {clientName || "um cliente"}</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver todos os meus clientes" onPress={() => { setLinkId(""); navigation.setParams({ linkId: undefined, scope: "mine" }); }} />
              <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: linkId })} />
            </View>
          </Card>
        ) : (
          <View style={u.row}>
            <Chip label="Todos os produtos" active={tab === "all"} onPress={() => setTab("all")} />
            <Chip label="Dos meus clientes" active={tab === "mine"} onPress={() => setTab("mine")} />
          </View>
        )}

        <Field
          placeholder="Procurar produto, vendedor ou local"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {tab === "mine" || linkId ? (
          <View style={u.grid}>
            {(
              [
                ["📦 Produtos", summary.total],
                ["✅ Disponíveis", summary.available],
                ["⛔ Indisponíveis", summary.unavailable],
                ["⚠️ A acabar", summary.lowStock],
              ] as [string, number][]
            ).map(([label, value]) => (
              <View key={label} style={u.tile}>
                <View style={u.tileBox}>
                  <Text style={u.tileValue}>{value}</Text>
                  <Text style={u.tileLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {!linkId ? <ChipGroup label="Categoria" options={departmentOptions} value={department} onChange={setDepartment} allowEmpty scroll /> : null}
        {!linkId && regions.length > 0 ? (
          <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}
        {tab === "mine" || linkId ? <ChipGroup label="Disponibilidade" options={AVAILABILITY} value={availability} onChange={setAvailability} allowEmpty scroll /> : null}

        {!linkId ? (
          <>
            <View style={u.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="Preço mínimo (FCFA)" value={minText} onChangeText={setMinText} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Preço máximo (FCFA)" value={maxText} onChangeText={setMaxText} keyboardType="numeric" />
              </View>
            </View>
            <Btn small kind="outline" label="Aplicar preços" onPress={applyPrices} />
            <ChipGroup label="Ordenar por" options={catalog.productSorts} value={sort} onChange={setSort} allowEmpty emptyLabel="Mais recentes" scroll />
          </>
        ) : null}

        {hasFilters ? <Btn small kind="outline" label="Limpar filtros" onPress={clearFilters} /> : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} produto(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Empty text={tab === "mine" || linkId ? "Nenhum produto com estes filtros." : "Nenhum produto encontrado."} />
        ) : null}

        {items.map((p) => (
          <ProductCard key={p.id} item={p} onPress={() => navigation.navigate("AgentProduct", { id: p.id })} />
        ))}

        {!linkId && items.length < total ? (
          <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} />
        ) : null}
      </Page>
    </AgentLayout>
  );
}
