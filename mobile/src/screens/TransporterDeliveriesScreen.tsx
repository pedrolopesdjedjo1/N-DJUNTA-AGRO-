import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { TransporterLayout } from "../components/TransporterTabs";
import { Page, Title, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import DeliveryCard from "../components/transporter/DeliveryCard";
import { listAvailableDeliveries, listMyDeliveries, acceptDelivery, declineDelivery } from "../api/transporter";
import { getGovRegions } from "../api/gov";
import { useTransportCatalog } from "../utils/transportCatalog";
import { placeLabel } from "../constants/transporter";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

type Tab = "available" | "upcoming" | "inProgress" | "completed";

const EMPTY_SUMMARY = { all: 0, matching: 0, overCapacity: 0, totalPayout: 0, isAvailable: true, hasRegions: true };
const EMPTY_COUNTS = { upcoming: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 };

export default function TransporterDeliveriesScreen({ navigation, route }: any) {
  const catalog = useTransportCatalog();

  const [tab, setTab] = useState<Tab>(route?.params?.tab ?? "available");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [region, setRegion] = useState("");
  const [fitOnly, setFitOnly] = useState(false);
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);

  const key = JSON.stringify({ tab, scope, region, fitOnly, sort, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      if (tab === "available") {
        const r = await listAvailableDeliveries({ scope, region, fit: fitOnly ? "yes" : "", q, sort, page: nextPage });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setSummary(r.summary);
        setPage(nextPage);
      } else {
        const r = await listMyDeliveries({ phase: tab, q, page: nextPage });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setCounts(r.counts);
        setPage(nextPage);
      }
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as entregas."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  // Os números das abas vêm da lista das minhas entregas
  async function loadCounts() {
    try {
      const r = await listMyDeliveries({ phase: "active" });
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

  function accept(c: any) {
    Alert.alert(
      "Aceitar a entrega",
      `${c.orderCode}: ${placeLabel(c.pickup, "recolha")} → ${placeLabel(c.destination, "destino")}\n${c.payout ? money(c.payout) : "Valor a combinar"}\n\nDepois de aceitar, fica responsável por esta entrega.`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Aceitar",
          onPress: async () => {
            setBusyId(c.id);
            try {
              await acceptDelivery(c.id);
              navigation.navigate("TransporterDelivery", { id: c.id });
            } catch (e) {
              Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível aceitar a entrega."));
              load(true);
            } finally {
              setBusyId("");
            }
          },
        },
      ]
    );
  }

  function decline(c: any) {
    Alert.alert("Recusar a entrega", "Esta entrega deixa de aparecer na sua lista. Os outros transportadores continuam a vê-la.", [
      { text: "Não", style: "cancel" },
      {
        text: "Recusar",
        style: "destructive",
        onPress: async () => {
          setBusyId(c.id);
          try {
            await declineDelivery(c.id);
            setItems((prev) => prev.filter((x) => x.id !== c.id));
            setTotal((n) => Math.max(0, n - 1));
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível recusar a entrega."));
          } finally {
            setBusyId("");
          }
        },
      },
    ]);
  }

  const tabs: [Tab, string][] = [
    ["available", "Disponíveis"],
    ["upcoming", `Aceites (${counts.upcoming})`],
    ["inProgress", `Em andamento (${counts.inProgress})`],
    ["completed", `Concluídas (${counts.completed})`],
  ];

  const emptyText: Record<Tab, string> = {
    available: summary.hasRegions
      ? "Não há entregas disponíveis com estes filtros. Volte daqui a pouco."
      : "Não há entregas disponíveis. Indique as suas regiões no perfil para ver as certas.",
    upcoming: "Não tem entregas aceites por recolher.",
    inProgress: "Não tem entregas em andamento.",
    completed: "Ainda não concluiu entregas.",
  };

  return (
    <TransporterLayout active="TransporterDeliveries">
      <Page>
        <Title>📦 Entregas</Title>

        <View style={u.row}>
          {tabs.map(([value, label]) => (
            <Chip key={value} label={label} active={tab === value} onPress={() => setTab(value)} />
          ))}
        </View>

        {tab === "available" ? (
          <>
            {!summary.isAvailable ? (
              <Card>
                <Text style={{ color: "#C62828", fontWeight: "bold" }}>🔴 Está marcado como indisponível</Text>
                <Text style={u.muted}>Pode ver as entregas, mas só pode aceitar depois de ligar a disponibilidade no Início.</Text>
                <Btn small kind="outline" label="Ir para o Início" onPress={() => navigation.navigate("TransporterHome")} />
              </Card>
            ) : null}

            <View style={u.grid}>
              {(
                [
                  ["🆕 Nas minhas regiões", String(summary.matching)],
                  ["🌍 Em todo o país", String(summary.all)],
                  ["💰 Valor total (minhas regiões)", money(summary.totalPayout)],
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

            <View style={u.row}>
              <Chip label="Minhas regiões" active={scope === "mine"} onPress={() => setScope("mine")} />
              <Chip label="Todo o país" active={scope === "all"} onPress={() => setScope("all")} />
              <Chip label="Só as que cabem no meu veículo" active={fitOnly} onPress={() => setFitOnly(!fitOnly)} />
            </View>

            {regions.length > 0 ? (
              <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
            ) : null}
            <ChipGroup label="Ordenar por" options={catalog.deliverySorts} value={sort} onChange={setSort} allowEmpty emptyLabel="Mais recentes" scroll />
          </>
        ) : null}

        <Field
          placeholder="Procurar por produto, local ou número"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} entrega(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={emptyText[tab]} /> : null}

        {items.map((c) => (
          <View key={c.id}>
            <DeliveryCard item={c} phases={catalog.deliveryPhases} onPress={() => navigation.navigate("TransporterDelivery", { id: c.id })} />
            {tab === "available" ? (
              <View style={u.row}>
                <Btn small label={busyId === c.id ? "..." : "✅ Aceitar"} onPress={() => accept(c)} disabled={busyId === c.id || !summary.isAvailable} />
                <Btn small kind="outline" label="Recusar" onPress={() => decline(c)} disabled={busyId === c.id} />
                <Btn small kind="outline" label="Detalhes" onPress={() => navigation.navigate("TransporterDelivery", { id: c.id })} />
              </View>
            ) : null}
          </View>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </TransporterLayout>
  );
}
