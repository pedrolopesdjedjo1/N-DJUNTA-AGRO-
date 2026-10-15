import React, { useState } from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { FisherLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getSeaConditions, getSeaZones } from "../api/sea";
import { getApiErrorMessage } from "../api/errorMessage";
import { SEA_LEVEL, formatDate } from "../constants/market";

const EMPTY = { data: null as any, zones: null as any, error: "" };

function val(value: any, suffix: string) {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function tideTime(value?: string | null) {
  if (!value) return "—";
  return `${value.slice(8, 10)}/${value.slice(5, 7)} ${value.slice(11, 16)}`;
}

const TREND: Record<string, string> = {
  ENCHENTE: "🔼 A encher (maré a subir)",
  VAZANTE: "🔽 A vazar (maré a descer)",
  PARADA: "⏸️ Maré parada",
};

export default function FisherSeaScreen({ navigation }: any) {
  const [zone, setZone] = useState("");

  const loader = useLoader(
    async () => {
      const [result, zones] = await Promise.all([
        getSeaConditions(zone || undefined)
          .then((data: any) => ({ data, error: "" }))
          .catch((e: any) => ({ data: null, error: getApiErrorMessage(e, "Não foi possível obter as condições do mar.") })),
        getSeaZones().catch(() => null),
      ]);
      return { data: result.data, zones, error: result.error };
    },
    EMPTY,
    [zone]
  );

  const d: any = loader.data.data;
  const zones: any = loader.data.zones;
  const level = d ? SEA_LEVEL[d.assessment.level] : null;

  return (
    <FisherLayout active="FisherSea">
      <Page loader={loader}>
        <Title>🌊 Mar e pesca</Title>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="📍 A minha zona" active={zone === ""} onPress={() => setZone("")} />
          {(d?.zones ?? []).map((z: any) => (
            <Chip key={z.id} label={z.name} active={zone === z.id} onPress={() => setZone(z.id)} />
          ))}
        </ScrollView>

        {loader.data.error ? <Empty text={loader.data.error} /> : null}

        {d && level ? (
          <>
            <Text style={[u.muted, { marginTop: 8 }]}>Zona: {d.zone.name}</Text>

            <SubTitle>⚓ Condições para sair para o mar</SubTitle>
            <Card>
              <View style={u.between}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: level.color }}>
                  {level.icon} {level.label}
                </Text>
              </View>
              {d.assessment.reasons.map((r: string, index: number) => (
                <Text key={index} style={{ marginTop: 4 }}>
                  • {r}
                </Text>
              ))}
              <Text style={[u.strong, { marginTop: 8 }]}>{d.assessment.advice}</Text>
              {d.next12h.maxWave !== null || d.next12h.maxWind !== null ? (
                <Text style={[u.muted, { marginTop: 6 }]}>
                  Próximas 12 h: ondas até {val(d.next12h.maxWave, " m")} · vento até {val(d.next12h.maxWind, " km/h")} · rajadas até {val(d.next12h.maxGust, " km/h")}
                </Text>
              ) : null}
            </Card>

            <Btn kind="danger" label="🆘 Emergência no mar" onPress={() => navigation.navigate("FisherSos")} />

            <SubTitle>Condições do mar agora</SubTitle>
            <Card>
              <Text>🌊 Altura das ondas: {val(d.current.waveHeight, " m")}</Text>
              <Text style={{ marginTop: 4 }}>
                ⏱️ Período das ondas: {val(d.current.wavePeriod, " s")} · vindas de {d.current.waveFrom ?? "—"}
              </Text>
              <Text style={{ marginTop: 4 }}>
                💨 Vento: {val(d.current.wind, " km/h")} · direção {d.current.windFrom ?? "—"}
              </Text>
              <Text style={{ marginTop: 4 }}>🌬️ Rajadas: {val(d.current.gust, " km/h")}</Text>
              <Text style={{ marginTop: 4 }}>🌡️ Temperatura da água: {val(d.current.seaTemperature, " °C")}</Text>
            </Card>

            <SubTitle>Maré</SubTitle>
            {d.tide ? (
              <Card>
                {d.tide.trend ? <Text style={u.strong}>{TREND[d.tide.trend]}</Text> : null}
                {d.tide.level !== null ? <Text style={u.muted}>Nível atual: {d.tide.level} m</Text> : null}
                <Text style={{ marginTop: 6 }}>
                  ⬆️ Próxima maré cheia: {d.tide.nextHigh ? tideTime(d.tide.nextHigh.time) : "—"}
                </Text>
                <Text style={{ marginTop: 2 }}>
                  ⬇️ Próxima maré vazia: {d.tide.nextLow ? tideTime(d.tide.nextLow.time) : "—"}
                </Text>
                <Text style={[u.muted, { marginTop: 6 }]}>{d.tide.note}</Text>
              </Card>
            ) : (
              <Text style={u.muted}>Sem dados de maré para esta zona. Confirme com os pescadores locais.</Text>
            )}

            <SubTitle>⚠️ Alertas de mau tempo</SubTitle>
            {d.alerts.auto.length === 0 && d.alerts.team.length === 0 ? (
              <Text style={u.muted}>Nenhum alerta para os próximos 3 dias.</Text>
            ) : (
              <>
                {d.alerts.auto.map((a: any, index: number) => (
                  <Card key={`${a.title}-${a.date}-${index}`}>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.title}</Text>
                      <Badge label={a.level === "ALTA" ? "Alto" : "Médio"} color={a.level === "ALTA" ? "#C62828" : "#F9A825"} />
                    </View>
                    <Text style={u.muted}>{a.detail}</Text>
                  </Card>
                ))}
                {d.alerts.team.map((a: any) => (
                  <Card key={a.id}>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>📢 {a.title}</Text>
                      <Badge label="Equipa" color="#1565C0" />
                    </View>
                    {a.description ? <Text style={u.muted}>{a.description}</Text> : null}
                  </Card>
                ))}
              </>
            )}

            <SubTitle>Previsão marítima (7 dias)</SubTitle>
            {d.days.map((day: any) => {
              const dl = SEA_LEVEL[day.assessment.level];
              return (
                <Card key={day.date}>
                  <View style={u.between}>
                    <Text style={u.strong}>
                      {dl.icon} {day.weekday} · {formatDate(`${day.date}T12:00:00`)}
                    </Text>
                    {day.storm ? <Badge label="Tempestade" color="#C62828" /> : null}
                  </View>
                  <Text style={u.muted}>
                    🌊 Ondas até {val(day.waveMax, " m")} (vindas de {day.waveFrom ?? "—"})
                  </Text>
                  <Text style={u.muted}>
                    💨 Vento até {val(day.windMax, " km/h")} · rajadas {val(day.gustMax, " km/h")} · de {day.windFrom ?? "—"}
                  </Text>
                  <Text style={u.muted}>🌧️ Chuva {day.rain} mm</Text>
                  <Text style={{ marginTop: 4, color: dl.color, fontWeight: "bold" }}>{dl.label}</Text>
                </Card>
              );
            })}

            <Text style={[u.muted, { marginTop: 10 }]}>{d.notice}</Text>
          </>
        ) : null}

        <SubTitle>🎣 Zonas de pesca</SubTitle>
        {!zones ? (
          <Text style={u.muted}>Não foi possível carregar as zonas agora.</Text>
        ) : (
          zones.zones.map((z: any) => {
            const zl = z.level ? SEA_LEVEL[z.level] : null;
            return (
              <Card key={z.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{z.name}</Text>
                  {zl ? <Badge label={zl.label} color={zl.color} /> : null}
                </View>
                <Text style={u.muted}>Zonas próximas: {z.regions.join(", ")}</Text>
                {z.available ? (
                  <Text style={u.muted}>
                    🌊 {val(z.waveHeight, " m")} · 💨 {val(z.wind, " km/h")} · rajadas {val(z.gust, " km/h")}
                  </Text>
                ) : (
                  <Text style={u.muted}>Sem dados agora.</Text>
                )}
                <View style={u.row}>
                  <Btn small label="Ver condições" onPress={() => setZone(z.id)} />
                  <Btn
                    small
                    kind="outline"
                    label="🗺️ Ponto no mapa"
                    onPress={() => Linking.openURL(`https://www.google.com/maps?q=${z.lat},${z.lng}`)}
                  />
                </View>
              </Card>
            );
          })
        )}
        {zones ? <Text style={u.muted}>Os pontos são referências ao largo da costa, não são locais de pesca garantidos.</Text> : null}
      </Page>
    </FisherLayout>
  );
}
