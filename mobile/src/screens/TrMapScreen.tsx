import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getTrMap } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { useMyPosition } from "../utils/trLocation";
import { labelOf } from "../utils/ngoCatalog";
import { kmLabel, pointUrl } from "../utils/trMaps";
import { MAP_LAYERS, SERVICE_ICON } from "../constants/transporterTools";
import { TR_CARGO_ICON, TR_PHASE_COLOR, TR_PHASE_ICON, trDirectionsUrl, trEtaText, trPlaceLabel, trWeightText } from "../constants/transporterV2";
import { SEVERITY_BO_COLOR } from "../constants/backoffice";
import { minutesText } from "../constants/agentOps";
import { money } from "../constants/market";

const EMPTY = {
  me: null as any,
  myRegions: [] as string[],
  deliveries: [] as any[],
  loads: [] as any[],
  markets: [] as any[],
  services: [] as any[],
  alerts: [] as any[],
  note: "",
};

export default function TrMapScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const { pos, loading: locating, refresh } = useMyPosition(false);
  const [layer, setLayer] = useState("deliveries");

  const loader = useLoader(() => getTrMap(pos ? { lat: pos.lat, lng: pos.lng } : {}), EMPTY, [pos?.lat, pos?.lng]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const counts: Record<string, number> = {
    deliveries: d.deliveries.length,
    loads: d.loads.length,
    markets: d.markets.length,
    services: d.services.length,
    alerts: d.alerts.length,
  };

  function open(url: string | null) {
    if (url) Linking.openURL(url);
  }

  function pointCard(p: any, icon: string) {
    const url = pointUrl(p);
    return (
      <Card key={p.id}>
        <Text style={u.strong}>
          {icon} {p.name}
        </Text>
        {p.address ? <Text style={u.muted}>{p.address}</Text> : null}
        <Text style={u.muted}>
          {[p.regionName ? `📍 ${p.regionName}` : "", p.distanceKm !== null && p.distanceKm !== undefined ? `📏 ${kmLabel(p.distanceKm, !p.exact)}` : ""].filter(Boolean).join(" · ")}
        </Text>
        {p.hours ? <Text style={u.muted}>🕒 {p.hours}</Text> : null}
        <View style={u.row}>
          {url ? <Btn small kind="outline" label="🧭 Abrir no mapa" onPress={() => open(url)} /> : null}
          {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
        </View>
      </Card>
    );
  }

  return (
    <TrLayout active="TrMap">
      <Page loader={loader}>
        <Title>🗺️ Mapa e rotas</Title>

        <Card>
          {pos ? (
            <>
              <Text style={u.strong}>📍 Está aqui{d.me?.region ? `, perto de ${d.me.region}` : ""}</Text>
              <Text style={u.muted}>As distâncias abaixo contam a partir de si.</Text>
            </>
          ) : (
            <>
              <Text style={u.strong}>📍 Localização desligada</Text>
              <Text style={u.muted}>Ative-a para ver a distância até cada carga, mercado e posto, e para a rota sugerida partir de onde está.</Text>
            </>
          )}
          <View style={u.row}>
            <Btn small kind={pos ? "outline" : "primary"} label={locating ? "A localizar..." : pos ? "🔄 Atualizar a minha posição" : "📍 Usar a minha localização"} onPress={() => refresh(true)} disabled={locating} />
            {pos ? <Btn small kind="outline" label="Ver onde estou" onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`)} /> : null}
          </View>
        </Card>

        <Btn label="🧭 Rota sugerida para as minhas entregas" onPress={() => navigation.navigate("TrRoutePlan")} />
        {d.myRegions.length > 0 ? <Text style={u.muted}>Regiões de atuação: {d.myRegions.join(", ")}</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MAP_LAYERS.map((l) => (
            <Chip key={l.key} label={`${l.icon} ${l.label} (${counts[l.key] ?? 0})`} active={layer === l.key} onPress={() => setLayer(l.key)} />
          ))}
        </ScrollView>

        {layer === "deliveries" ? (
          <>
            <SubTitle>Minhas entregas em curso</SubTitle>
            {d.deliveries.length === 0 ? (
              <Empty text="Não tem entregas em curso. Veja as cargas por perto." />
            ) : (
              d.deliveries.map((c: any) => {
                const minutes = c.lastLocationAt ? Math.floor((Date.now() - new Date(c.lastLocationAt).getTime()) / 60000) : null;
                return (
                  <Card key={c.id}>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                        {TR_PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
                      </Text>
                      <Badge label={labelOf(catalog.deliveryPhases, c.phase) || c.phase} color={TR_PHASE_COLOR[c.phase] ?? "#757575"} />
                    </View>
                    <Text style={{ marginTop: 4 }}>📍 {trPlaceLabel(c.pickup, "Recolha por confirmar")}</Text>
                    <Text>🏁 {trPlaceLabel(c.destination, "Destino por confirmar")}</Text>
                    <Text style={u.muted}>
                      {[c.distanceKm !== null && c.distanceKm !== undefined ? `📏 ${kmLabel(c.distanceKm, true)}` : "", trEtaText(c.etaMinutes) ? `⏱️ ${trEtaText(c.etaMinutes)}` : ""].filter(Boolean).join(" · ")}
                    </Text>
                    {c.phase === "EM_TRANSPORTE" ? (
                      <Text style={{ color: minutes !== null && minutes > 30 ? "#EF6C00" : undefined }}>
                        📡 {c.lastLocationAt ? `${c.lastLocation ?? "Localização partilhada"} · ${minutesText(minutes)}` : "Ainda sem localização partilhada"}
                      </Text>
                    ) : null}
                    <View style={u.row}>
                      {c.phase === "ACEITE" && trDirectionsUrl(c.pickup) ? <Btn small kind="outline" label="🧭 Ir à recolha" onPress={() => open(trDirectionsUrl(c.pickup))} /> : null}
                      {trDirectionsUrl(c.destination) ? <Btn small kind="outline" label="🧭 Ir ao destino" onPress={() => open(trDirectionsUrl(c.destination))} /> : null}
                      <Btn small label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />
                    </View>
                  </Card>
                );
              })
            )}
          </>
        ) : null}

        {layer === "loads" ? (
          <>
            <SubTitle>Cargas por perto que servem ao seu veículo</SubTitle>
            {d.loads.length === 0 ? (
              <Empty text="Não há cargas nas suas regiões que sirvam ao seu veículo." />
            ) : (
              d.loads.map((c: any) => (
                <Card key={c.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Carga {c.orderCode}</Text>
                    <Text style={{ fontWeight: "bold" }}>{c.payout ? money(c.payout) : "A combinar"}</Text>
                  </View>
                  <Text style={{ marginTop: 4 }}>📍 {trPlaceLabel(c.pickup, "Recolha")}</Text>
                  <Text>🏁 {trPlaceLabel(c.destination, "Destino")}</Text>
                  <Text style={u.muted}>
                    {[
                      (c.cargoTypes as string[]).map((t) => TR_CARGO_ICON[t] ?? "📦").join(" "),
                      trWeightText(c.weightKg) ? `⚖️ ${trWeightText(c.weightKg)}` : "",
                      c.fromMeKm !== null && c.fromMeKm !== undefined ? `🧭 a ${kmLabel(c.fromMeKm, false)} de si` : "",
                      c.distanceKm !== null && c.distanceKm !== undefined ? `📏 ${kmLabel(c.distanceKm, true)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  <View style={u.row}>
                    {trDirectionsUrl(c.pickup) ? <Btn small kind="outline" label="🧭 Ver a recolha" onPress={() => open(trDirectionsUrl(c.pickup))} /> : null}
                    <Btn small label="Ver a carga" onPress={() => navigation.navigate("TrDelivery", { id: c.id })} />
                  </View>
                </Card>
              ))
            )}
          </>
        ) : null}

        {layer === "markets" ? (
          <>
            <SubTitle>Mercados</SubTitle>
            {d.markets.length === 0 ? <Empty text="Ainda não há mercados registados nas suas regiões." /> : d.markets.map((m: any) => pointCard(m, "🛒"))}
          </>
        ) : null}

        {layer === "services" ? (
          <>
            <SubTitle>Postos de combustível, oficinas e serviços</SubTitle>
            {d.services.length === 0 ? (
              <Empty text="Ainda não há locais publicados nas suas regiões. Pode sugerir os que conhece." />
            ) : (
              d.services.slice(0, 15).map((s: any) => pointCard(s, SERVICE_ICON[s.kind] ?? "📍"))
            )}
            <View style={u.row}>
              <Btn small kind="outline" label="Ver todos os serviços" onPress={() => navigation.navigate("TrTools")} />
              <Btn small kind="outline" label="➕ Sugerir um local" onPress={() => navigation.navigate("TrServiceSuggest")} />
            </View>
          </>
        ) : null}

        {layer === "alerts" ? (
          <>
            <SubTitle>Alertas de estrada e clima</SubTitle>
            {d.alerts.length === 0 ? (
              <Empty text="Não há alertas oficiais nas regiões por onde passa." />
            ) : (
              d.alerts.map((a: any) => (
                <Card key={a.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>⚠️ {a.title}</Text>
                    <Badge label={a.severity} color={SEVERITY_BO_COLOR[a.severity] ?? "#EF6C00"} />
                  </View>
                  <Text style={u.muted}>{a.regions.length > 0 ? a.regions.join(", ") : "Todo o país"}</Text>
                </Card>
              ))
            )}
            <Btn small kind="outline" label="🌦️ Ver o clima" onPress={() => navigation.navigate("Weather")} />
            <Text style={u.muted}>Os avisos da equipa NÔDJUNTA chegam-lhe por notificação.</Text>
          </>
        ) : null}

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
      </Page>
    </TrLayout>
  );
}
