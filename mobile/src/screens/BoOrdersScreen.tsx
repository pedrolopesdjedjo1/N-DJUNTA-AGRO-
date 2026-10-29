import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import BoOrderCard from "../components/admin/BoOrderCard";
import { Page, Title, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoOrders, getBoUser } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { ORDER_GROUP_ICON } from "../constants/backofficeOrders";
import { isDateText } from "../utils/dates";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

const EMPTY_SUMMARY = { all: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0, problems: 0 };

const SORTS = [
  { value: "VALOR", label: "Maior valor" },
  { value: "ANTIGAS", label: "Mais antigas" },
];

export default function BoOrdersScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();

  const [group, setGroup] = useState<string>(route?.params?.group ?? "ALL");
  const [buyerId, setBuyerId] = useState<string>(route?.params?.buyerId ?? "");
  const [sellerId, setSellerId] = useState<string>(route?.params?.sellerId ?? "");
  const [personName, setPersonName] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [minText, setMinText] = useState("");
  const [range, setRange] = useState({ from: "", to: "", min: "" });
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.group) setGroup(p.group);
    if (p.buyerId !== undefined) setBuyerId(p.buyerId ?? "");
    if (p.sellerId !== undefined) setSellerId(p.sellerId ?? "");
  }, [route?.params]);

  const personId = buyerId || sellerId;
  useEffect(() => {
    setPersonName("");
    if (personId) {
      getBoUser(personId)
        .then((r: any) => setPersonName(r.user?.name ?? ""))
        .catch(() => {});
    }
  }, [personId]);

  const key = JSON.stringify({ group, buyerId, sellerId, region, sort, q, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoOrders({ group, buyerId, sellerId, region, sort, q, from: range.from, to: range.to, minTotal: range.min, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as encomendas."));
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

  const counts: Record<string, number> = {
    ALL: summary.all,
    PENDING: summary.pending,
    IN_PROGRESS: summary.inProgress,
    COMPLETED: summary.completed,
    CANCELLED: summary.cancelled,
    PROBLEMS: summary.problems,
  };

  function applyFilters() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-10-01).");
      return;
    }
    setRange({ from: fromText.trim(), to: toText.trim(), min: minText.replace(/\D/g, "") });
  }

  function clearAll() {
    setRegion("");
    setSort("");
    setText("");
    setQ("");
    setFromText("");
    setToText("");
    setMinText("");
    setRange({ from: "", to: "", min: "" });
  }

  const hasFilters = !!(region || sort || q || range.from || range.to || range.min);

  const tiles: [string, string, string][] = [
    ["PENDING", "🆕 Pendentes", String(summary.pending)],
    ["IN_PROGRESS", "🚚 Em andamento", String(summary.inProgress)],
    ["COMPLETED", "🏁 Concluídas", String(summary.completed)],
    ["CANCELLED", "🚫 Canceladas", String(summary.cancelled)],
    ["PROBLEMS", "⚠️ Com problemas", String(summary.problems)],
  ];

  return (
    <AdminLayout active="BoOrders">
      <Page>
        <Title>📦 Encomendas</Title>

        <View style={u.grid}>
          {tiles.map(([g, label, value]) => (
            <TouchableOpacity key={g} style={u.tile} onPress={() => setGroup(g)}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { color: g === "PROBLEMS" && summary.problems > 0 ? "#EF6C00" : undefined }]}>{formatNumber(Number(value))}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={u.row}>
          <Btn small kind="outline" label="⚖️ Disputas" onPress={() => navigation.navigate("BoDisputes")} />
          {adminCan("finance.view") ? <Btn small kind="outline" label="↩️ Reembolsos" onPress={() => navigation.navigate("BoRefunds")} /> : null}
          {adminCan("transport.view") ? <Btn small kind="outline" label="🚚 Entregas" onPress={() => navigation.navigate("BoTransport")} /> : null}
        </View>

        {personId ? (
          <View style={u.row}>
            <Chip
              label={`👤 ${buyerId ? "Compras" : "Vendas"} de ${personName || "uma pessoa"} ✕`}
              active
              onPress={() => {
                setBuyerId("");
                setSellerId("");
                navigation.setParams({ buyerId: undefined, sellerId: undefined });
              }}
            />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {catalog.orderGroups.map((g) => (
            <Chip key={g.value} label={`${ORDER_GROUP_ICON[g.value] ?? ""} ${g.label} (${formatNumber(counts[g.value] ?? 0)})`.trim()} active={group === g.value} onPress={() => setGroup(g.value)} />
          ))}
        </ScrollView>

        <Field
          placeholder="Procurar por número (ex: A1B2C3) ou por nome"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <View style={u.row}>
          <Chip label={showFilters ? "Menos filtros" : "Mais filtros"} active={showFilters} onPress={() => setShowFilters(!showFilters)} />
          {hasFilters ? <Chip label="Limpar" active={false} onPress={clearAll} /> : null}
        </View>

        {showFilters ? (
          <>
            {regions.length > 0 ? (
              <ChipGroup label="Região de quem participa" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
            ) : null}
            <ChipGroup label="Ordenar por" options={SORTS} value={sort} onChange={setSort} allowEmpty emptyLabel="Mais recentes" scroll />
            <Text style={u.label}>Feita entre</Text>
            <View style={u.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-10-01" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-10-31" />
              </View>
            </View>
            <Field label="Valor mínimo (FCFA)" value={minText} onChangeText={(v) => setMinText(v.replace(/\D/g, ""))} keyboardType="numeric" placeholder="Ex: 100000" />
            <Btn small kind="outline" label="Aplicar" onPress={applyFilters} />
          </>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} encomenda(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={group === "PROBLEMS" ? "Nenhuma encomenda com problemas. Tudo em ordem." : "Nenhuma encomenda com estes filtros."} /> : null}

        {items.map((o) => (
          <BoOrderCard key={o.id} item={o} problems={catalog.orderProblems} onPress={() => navigation.navigate("BoOrder", { id: o.id })} />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
