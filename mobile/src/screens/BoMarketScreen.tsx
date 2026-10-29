import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import BoProductCard from "../components/admin/BoProductCard";
import { Page, Title, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoProducts, bulkApproveBoProducts, getBoUser } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { DEPARTMENT_ICON, MARKET_QUEUES } from "../constants/backofficeMarket";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

const EMPTY_SUMMARY = { all: 0, visible: 0, hidden: 0, rejected: 0, removed: 0, attention: 0, toReview: 0, reported: 0, featured: 0 };

export default function BoMarketScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const canModerate = adminCan("market.moderate");

  const [queue, setQueue] = useState<string>(route?.params?.queue ?? (route?.params?.ownerId ? "all" : "review"));
  const [ownerId, setOwnerId] = useState<string>(route?.params?.ownerId ?? "");
  const [ownerName, setOwnerName] = useState("");
  const [department, setDepartment] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.ownerId !== undefined) setOwnerId(p.ownerId ?? "");
    if (p.queue) setQueue(p.queue);
    else if (p.ownerId) setQueue("all");
  }, [route?.params]);

  useEffect(() => {
    setOwnerName("");
    if (ownerId) {
      getBoUser(ownerId)
        .then((r: any) => setOwnerName(r.user?.name ?? ""))
        .catch(() => {});
    }
  }, [ownerId]);

  const status = MARKET_QUEUES.find((x) => x.key === queue)?.status ?? "";
  const key = JSON.stringify({ queue, ownerId, department, region, sort, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoProducts({ status, ownerId, department, region, sort, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setPage(nextPage);
      if (reset) setPicked([]);
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

  const counts: Record<string, number> = {
    review: summary.toReview,
    reported: summary.reported,
    attention: summary.attention,
    visible: summary.visible,
    hidden: summary.hidden,
    rejected: summary.rejected,
    removed: summary.removed,
    featured: summary.featured,
    all: summary.all,
  };

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 50 ? prev : [...prev, id]));
  }

  function approveAll() {
    if (picked.length === 0) return;
    Alert.alert("Aprovar produtos", `Marcar ${picked.length} produto(s) como revistos e aprovados?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Aprovar",
        onPress: async () => {
          setApproving(true);
          try {
            const r = await bulkApproveBoProducts(picked);
            Alert.alert("Pronto", `${r.approved} produto(s) aprovado(s).${r.skipped ? ` ${r.skipped} ficaram de fora (estão escondidos pela equipa).` : ""}`);
            load(true);
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível aprovar."));
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  }

  const canBulk = canModerate && queue === "review";
  const hasFilters = !!(department || region || sort || q);

  return (
    <AdminLayout active="BoMarket">
      <Page>
        <Title>🛒 Mercado</Title>

        <View style={u.grid}>
          {(
            [
              ["📦 Produtos", summary.all],
              ["✅ Visíveis", summary.visible],
              ["🆕 Para rever", summary.toReview],
              ["🚩 Denunciados", summary.reported],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Btn small kind="outline" label="⭐ Destaques" onPress={() => navigation.navigate("BoFeatured")} />
          <Btn small kind="outline" label="🔍 Controlo de qualidade" onPress={() => navigation.navigate("BoQuality")} />
          <Btn small kind="outline" label="🏷️ Categorias" onPress={() => navigation.navigate("BoCategories")} />
        </View>

        {ownerId ? (
          <View style={u.row}>
            <Chip label={`👤 Só de ${ownerName || "um vendedor"} ✕`} active onPress={() => { setOwnerId(""); navigation.setParams({ ownerId: undefined }); }} />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MARKET_QUEUES.map((x) => (
            <Chip key={x.key} label={`${x.label} (${formatNumber(counts[x.key] ?? 0)})`} active={queue === x.key} onPress={() => setQueue(x.key)} />
          ))}
        </ScrollView>

        <Field
          placeholder="Procurar por produto ou subcategoria"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <View style={u.row}>
          <Chip label={showFilters ? "Menos filtros" : "Mais filtros"} active={showFilters} onPress={() => setShowFilters(!showFilters)} />
          {hasFilters ? (
            <Chip
              label="Limpar"
              active={false}
              onPress={() => {
                setDepartment("");
                setRegion("");
                setSort("");
                setText("");
                setQ("");
              }}
            />
          ) : null}
        </View>

        {showFilters ? (
          <>
            <ChipGroup
              label="Categoria"
              options={catalog.departments.map((d) => ({ value: d.value, label: d.label, icon: DEPARTMENT_ICON[d.value] }))}
              value={department}
              onChange={setDepartment}
              allowEmpty
              scroll
            />
            {regions.length > 0 ? (
              <ChipGroup label="Região do vendedor" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
            ) : null}
            <ChipGroup label="Ordenar por" options={catalog.marketSorts} value={sort} onChange={setSort} allowEmpty emptyLabel="Mais recentes" scroll />
          </>
        ) : null}

        {canBulk && items.length > 0 ? (
          <View style={u.row}>
            <Btn small kind="outline" label="Escolher todos desta página" onPress={() => setPicked(items.slice(0, 50).map((p) => p.id))} />
            {picked.length > 0 ? <Btn small kind="outline" label="Limpar escolha" onPress={() => setPicked([])} /> : null}
            <Btn small label={approving ? "A aprovar..." : `✅ Aprovar ${picked.length || ""}`} onPress={approveAll} disabled={approving || picked.length === 0} />
          </View>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} produto(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Empty text={queue === "review" ? "Não há produtos novos por rever." : queue === "reported" ? "Nenhum produto com denúncias abertas." : "Nenhum produto com estes filtros."} />
        ) : null}

        {items.map((p) => (
          <BoProductCard
            key={p.id}
            item={p}
            qualityFlags={catalog.qualityFlags}
            onPress={() => navigation.navigate("BoProduct", { id: p.id })}
            selected={picked.includes(p.id)}
            onToggle={canBulk ? () => toggle(p.id) : undefined}
          />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
