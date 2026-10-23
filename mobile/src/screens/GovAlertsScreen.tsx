import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import AlertCard from "../components/gov/AlertCard";
import { listAlerts, getMyAlerts } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { ALERT_KIND_ICON, SEVERITY_ICON } from "../constants/gov";

type Tab = "region" | "all" | "mine";

const EMPTY = { region: null as string | null, total: 0, active: 0, items: [] as any[] };

// Alertas oficiais. Qualquer pessoa vê os alertas da sua região. As instituições veem e gerem os seus.
export default function GovAlertsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const catalog = useGovCatalog();
  const canManage = user?.role === "GOVERNO" || user?.role === "ADMIN";

  const [tab, setTab] = useState<Tab>("region");
  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [severity, setSeverity] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const loader = useLoader(
    async () => {
      if (tab === "mine") {
        const r = await getMyAlerts();
        return { region: null, total: r.total, active: r.active, items: r.items };
      }
      const r = await listAlerts({ kind, severity, all: tab === "all" });
      return { region: r.region, total: r.total, active: r.total, items: r.items };
    },
    EMPTY,
    [tab, kind, severity]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  let items: any[] = d.items;
  if (tab === "mine") {
    items = items.filter(
      (a) =>
        (!kind || a.kind === kind) &&
        (!severity || a.severity === severity) &&
        (!onlyActive || a.state === "ATIVO" || a.state === "AGENDADO")
    );
  }

  return (
    <Page loader={loader}>
      <Title>🚨 Alertas oficiais</Title>
      <Text style={u.muted}>Avisos do Governo sobre chuva, seca, tempestades, inundações, agricultura, mar e emergências.</Text>

      {canManage ? (
        <View style={u.row}>
          <Btn small label="➕ Criar alerta" onPress={() => navigation.navigate("GovAlertForm", { kind: kind || undefined })} />
          <Btn small kind="outline" label="🌦️ Clima e previsão" onPress={() => navigation.navigate("GovWeather")} />
        </View>
      ) : null}

      <View style={u.row}>
        <Chip label="Na minha região" active={tab === "region"} onPress={() => setTab("region")} />
        <Chip label="Todo o país" active={tab === "all"} onPress={() => setTab("all")} />
        {canManage ? <Chip label="Os meus alertas" active={tab === "mine"} onPress={() => setTab("mine")} /> : null}
      </View>

      {tab === "region" ? (
        d.region ? (
          <Text style={[u.muted, { marginTop: 6 }]}>📍 Região: {d.region}</Text>
        ) : (
          <Card>
            <Text style={u.muted}>Não conhecemos a sua região, por isso só vê os alertas para todo o país. Escreva a sua localização nas configurações.</Text>
            <Btn small kind="outline" label="⚙️ Definir a minha localização" onPress={() => navigation.navigate("Settings")} />
          </Card>
        )
      ) : null}

      <ChipGroup
        label="Tipo de alerta"
        options={catalog.alertKinds.map((k) => ({ ...k, icon: ALERT_KIND_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
        allowEmpty
        scroll
      />
      <ChipGroup
        label="Gravidade"
        options={catalog.alertSeverity.map((s) => ({ ...s, icon: SEVERITY_ICON[s.value] }))}
        value={severity}
        onChange={setSeverity}
        allowEmpty
        scroll
      />

      {tab === "mine" ? (
        <View style={u.row}>
          <Chip label="Só ativos e agendados" active={onlyActive} onPress={() => setOnlyActive(!onlyActive)} />
        </View>
      ) : null}

      <Text style={[u.muted, { marginTop: 8 }]}>
        {loader.loading && items.length === 0
          ? "A carregar..."
          : tab === "mine"
          ? `${d.active} ativo(s) de ${d.total}`
          : `${items.length} alerta(s) ativo(s)`}
      </Text>

      {items.length === 0 && !loader.loading ? (
        <Empty text={tab === "mine" ? "Não tem alertas com estes filtros." : "Não há alertas ativos. Boas notícias!"} />
      ) : (
        items.map((a) => (
          <AlertCard key={a.id} alert={a} catalog={catalog} showState={tab === "mine"} onPress={() => navigation.navigate("GovAlert", { id: a.id })} />
        ))
      )}
    </Page>
  );
}
