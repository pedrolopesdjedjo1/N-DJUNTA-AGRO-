import React, { useCallback, useState } from "react";
import { View, Text, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, u } from "../components/ui";
import { getTrRoutePlan } from "../api/transporterV2";
import { getPosition, Pos } from "../utils/trLocation";
import { kmLabel, routeUrl } from "../utils/trMaps";
import { trDirectionsUrl, trEtaText, trPlaceLabel, trWeightText } from "../constants/transporterV2";
import { getApiErrorMessage } from "../api/errorMessage";

// Rota sugerida: todas as entregas em curso, recolhas antes das entregas, sempre a paragem mais perto
export default function TrRoutePlanScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (ask: boolean) => {
    setBusy(true);
    setError("");
    try {
      const p = await getPosition(ask);
      setPos(p);
      setData(await getTrRoutePlan(p ? { lat: p.lat, lng: p.lng } : {}));
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível calcular a rota."));
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  const stops: any[] = data?.stops ?? [];
  const fullRoute = routeUrl([...stops.map((s) => s.place), ...(data?.withoutPoint ?? []).map((s: any) => s.place)], pos);

  return (
    <TrLayout active="TrMap">
      <Page>
        <Title>🧭 Rota sugerida</Title>
        <Text style={u.muted}>A melhor ordem para as suas entregas em curso: as recolhas antes das entregas, sempre a paragem mais perto.</Text>

        {!pos ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>Sem a sua localização, a rota começa na primeira paragem.</Text>
            <Btn small label="📍 Usar a minha localização" onPress={() => load(true)} disabled={busy} />
          </Card>
        ) : null}

        {error ? <Empty text={error} /> : null}
        {busy && !data ? <Text style={u.muted}>A calcular...</Text> : null}

        {data && stops.length === 0 && data.withoutPoint.length === 0 ? (
          <Empty text="Não tem entregas em curso. Aceite uma carga para ver a rota." />
        ) : null}

        {data && (stops.length > 0 || data.withoutPoint.length > 0) ? (
          <>
            <View style={u.grid}>
              {(
                [
                  ["📏 Distância total", kmLabel(data.totalKm, true) ?? "—"],
                  ["⏱️ Tempo estimado", trEtaText(data.totalMinutes) ?? "—"],
                  ["⚖️ Carga máxima", trWeightText(data.maxLoadKg) ?? "—"],
                  ["🚚 Capacidade", data.capacityKg ? `${data.capacityKg} kg` : "por indicar"],
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

            {data.overCapacityAtStop ? (
              <Card>
                <Text style={{ color: "#C62828", fontWeight: "bold" }}>⛔ A carga passa a capacidade do veículo na paragem {data.overCapacityAtStop}</Text>
                <Text style={u.muted}>Entregue alguma carga antes de recolher a seguinte, ou fale com o vendedor para trocar a ordem.</Text>
              </Card>
            ) : null}

            {fullRoute ? <Btn label="🧭 Abrir a rota completa no mapa" onPress={() => Linking.openURL(fullRoute)} /> : null}

            <SubTitle>Paragens ({stops.length})</SubTitle>
            {stops.map((s) => (
              <Card key={`${s.deliveryId}-${s.kind}-${s.order}`}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {s.order}. {s.kind === "RECOLHA" ? "📍 Recolher" : "🏁 Entregar"} · {s.orderCode}
                  </Text>
                  <Badge label={s.kind === "RECOLHA" ? "Recolha" : "Entrega"} color={s.kind === "RECOLHA" ? "#EF6C00" : "#2E7D32"} />
                </View>
                <Text style={{ marginTop: 2 }}>{trPlaceLabel(s.place, "Local por confirmar")}</Text>
                <Text style={u.muted}>
                  {[
                    s.legKm !== null ? `+ ${kmLabel(s.legKm, true)}` : "",
                    s.legMinutes !== null ? `⏱️ ${trEtaText(s.legMinutes)}` : "",
                    `⚖️ ${trWeightText(s.loadAfterKg) ?? "0 kg"} a bordo depois`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={u.muted}>Chegada estimada: daqui a {trEtaText(s.cumulativeMinutes) ?? "—"}</Text>
                <View style={u.row}>
                  {trDirectionsUrl(s.place) ? <Btn small kind="outline" label="🧭 Ir para aqui" onPress={() => Linking.openURL(trDirectionsUrl(s.place) as string)} /> : null}
                  <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: s.deliveryId })} />
                </View>
              </Card>
            ))}

            {data.withoutPoint.length > 0 ? (
              <>
                <SubTitle>Sem localização conhecida ({data.withoutPoint.length})</SubTitle>
                <Text style={u.muted}>Estas paragens não têm local nem região reconhecidos. Combine com o vendedor ou o comprador.</Text>
                {data.withoutPoint.map((s: any) => (
                  <Card key={`${s.deliveryId}-${s.kind}`}>
                    <Text style={u.strong}>
                      {s.kind === "RECOLHA" ? "📍 Recolher" : "🏁 Entregar"} · {s.orderCode}
                    </Text>
                    <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: s.deliveryId })} />
                  </Card>
                ))}
              </>
            ) : null}

            {data.alerts.length > 0 ? (
              <>
                <SubTitle>⚠️ Alertas pelo caminho</SubTitle>
                {data.alerts.map((a: any) => (
                  <Text key={a.id} style={{ color: "#EF6C00", marginTop: 4 }}>
                    • {a.title} ({a.regions.join(", ") || "todo o país"})
                  </Text>
                ))}
              </>
            ) : null}

            <Text style={[u.muted, { marginTop: 10 }]}>{data.note}</Text>
            <Btn small kind="outline" label="🔄 Recalcular" onPress={() => load(true)} disabled={busy} />
          </>
        ) : null}
      </Page>
    </TrLayout>
  );
}
