import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import TrDeliveryCard from "../components/transporter/TrDeliveryCard";
import { Page, Title, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listTrAvailable, listTrMine, acceptTrDelivery, declineTrDelivery } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { useMyPosition } from "../utils/trLocation";
import { TR_CARGO_ICON } from "../constants/transporterV2";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

type Tab = "available" | "upcoming" | "inProgress" | "completed" | "cancelled";

const TABS: Tab[] = ["available", "upcoming", "inProgress", "completed", "cancelled"];
const TAB_LABEL: Record<Tab, string> = {
  available: "🆕 Disponíveis",
  upcoming: "📋 Próximas",
  inProgress: "🚚 Em andamento",
  completed: "✅ Concluídas",
  cancelled: "🚫 Canceladas",
};

function initialTab(params: any): Tab {
  const wanted = params?.tab ?? params?.phase;
  return TABS.includes(wanted) ? wanted : "available";
}

export default function TrDeliveriesScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();
  const { pos, refresh } = useMyPosition(false);

  const [tab, setTab] = useState<Tab>(initialTab(route?.params));
  const [cargo, setCargo] = useState("");
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [allRegions, setAllRegions] = useState(false);
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [counts, setCounts] = useState({ upcoming: 0, inProgress: 0, completed: 0, cancelled: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.tab || route?.params?.phase) setTab(initialTab(route.params));
  }, [route?.params?.tab, route?.params?.phase]);

  const key = JSON.stringify({ tab, cargo, onlyCompatible, allRegions, sort, q, pos: !!pos });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      if (tab === "available") {
        const r = await listTrAvailable({
          scope: allRegions ? "all" : "",
          cargo,
          compatible: onlyCompatible ? "yes" : "",
          sort,
          q,
          page: nextPage,
          lat: pos?.lat,
          lng: pos?.lng,
        });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setSummary(r.summary);
      } else {
        const r = await listTrMine({ phase: tab, q, page: nextPage });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setCounts(r.counts);
      }
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as entregas."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  async function loadCounts() {
    try {
      const r = await listTrMine({ phase: "upcoming" });
      setCounts(r.counts);
    } catch (e) {
      // os números ficam como estão
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      loadCounts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  async function chooseSort(value: string) {
    setSort(value);
    if (value === "PERTO" && !pos) {
      const p = await refresh(true);
      if (!p) Alert.alert("Localização desligada", "Sem a sua localização, ordeno pela distância da viagem. Ative a localização para ver as cargas mais perto de si.");
    }
  }

  function accept(c: any) {
    Alert.alert("Aceitar a entrega", `Vai transportar a encomenda ${c.orderCode}${c.payout ? ` por ${money(c.payout)}` : ""}. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Aceitar",
        onPress: async () => {
          setActingId(c.id);
          try {
            await acceptTrDelivery(c.id);
            navigation.navigate("TrDelivery", { id: c.id });
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível aceitar a entrega."));
            load(true);
          } finally {
            setActingId("");
          }
        },
      },
    ]);
  }

  function decline(c: any) {
    Alert.alert("Recusar a entrega", "Esta entrega deixa de aparecer na sua lista.", [
      { text: "Não", style: "cancel" },
      {
        text: "Recusar",
        onPress: async () => {
          setActingId(c.id);
          try {
            await declineTrDelivery(c.id);
            setItems((prev) => prev.filter((x) => x.id !== c.id));
            setTotal((n) => Math.max(0, n - 1));
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recusar."));
          } finally {
            setActingId("");
          }
        },
      },
    ]);
  }

  const tabCount = (t: Tab): number | null => (t === "available" ? summary?.compatible ?? null : counts[t as keyof typeof counts] ?? 0);
  const isAvailable = tab === "available";

  return (
    <TrLayout active="TrDeliveries">
      <Page>
        <Title>📦 Entregas</Title>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((t) => {
            const n = tabCount(t);
            return <Chip key={t} label={`${TAB_LABEL[t]}${n !== null ? ` (${n})` : ""}`} active={tab === t} onPress={() => { setTab(t); setItems([]); }} />;
          })}
        </ScrollView>

        {isAvailable && summary ? (
          <>
            {!summary.vehicleReady ? (
              <Card>
                <Text style={{ color: "#C62828", fontWeight: "bold" }}>⛔ O veículo ainda não está pronto para aceitar entregas.</Text>
                <Text style={u.muted}>Registe o veículo, a capacidade de carga e ponha-o operacional.</Text>
                <Btn small label="Abrir o meu veículo" onPress={() => navigation.navigate("TrVehicle")} />
              </Card>
            ) : !summary.isAvailable ? (
              <Card>
                <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>Está marcado como indisponível.</Text>
                <Text style={u.muted}>Ligue a disponibilidade no perfil para aceitar entregas.</Text>
                <Btn small kind="outline" label="Ir ao perfil" onPress={() => navigation.navigate("TrProfile")} />
              </Card>
            ) : null}

            <View style={u.grid}>
              {(
                [
                  ["Nas suas regiões", formatNumber(summary.matching)],
                  ["Que servem ao veículo", formatNumber(summary.compatible)],
                  ["Valor total", money(summary.totalPayout)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View key={label} style={u.tile}>
                  <View style={u.tileBox}>
                    <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                    <Text style={u.tileLabel}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="Todos os tipos" active={cargo === ""} onPress={() => setCargo("")} />
              {catalog.cargoTypes.map((c) => (
                <Chip key={c.value} label={`${TR_CARGO_ICON[c.value] ?? "📦"} ${c.label} (${summary.byCargo?.[c.value] ?? 0})`} active={cargo === c.value} onPress={() => setCargo(c.value)} />
              ))}
            </ScrollView>

            <View style={u.row}>
              <Chip label={onlyCompatible ? "✅ Só as que servem ao meu veículo" : "Só as que servem ao meu veículo"} active={onlyCompatible} onPress={() => setOnlyCompatible(!onlyCompatible)} />
              <Chip label={allRegions ? "🌍 De todas as regiões" : "De todas as regiões"} active={allRegions} onPress={() => setAllRegions(!allRegions)} />
            </View>
            <ChipGroup label="Ordenar por" options={catalog.deliverySorts} value={sort} onChange={chooseSort} allowEmpty emptyLabel="Mais recentes" scroll />
          </>
        ) : null}

        <Field
          placeholder="Procurar por produto, local ou número"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} entrega(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Empty
            text={
              isAvailable
                ? "Não há cargas com estes filtros. Tire 'só as que servem ao meu veículo' ou veja as outras regiões."
                : tab === "upcoming"
                ? "Não tem entregas por recolher."
                : tab === "inProgress"
                ? "Não tem entregas em andamento."
                : tab === "completed"
                ? "Ainda não concluiu entregas."
                : "Não tem entregas canceladas."
            }
          />
        ) : null}

        {items.map((c) => (
          <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })}>
            {isAvailable ? (
              <View style={u.row}>
                <Btn small label={actingId === c.id ? "..." : "✅ Aceitar"} onPress={() => accept(c)} disabled={actingId === c.id || !c.compatibility.ok} />
                <Btn small kind="outline" label="Recusar" onPress={() => decline(c)} disabled={actingId === c.id} />
              </View>
            ) : null}
          </TrDeliveryCard>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </TrLayout>
  );
}
