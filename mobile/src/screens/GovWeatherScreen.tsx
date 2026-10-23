import React, { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import AlertCard from "../components/gov/AlertCard";
import { getForecast, getWeatherRegions } from "../api/weather";
import { getSeaZones } from "../api/sea";
import { listAlerts } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { ZONE_TO_REGIONS, alertFromForecast, regionKeyOfTown } from "../utils/govRegions";
import { ALERT_KIND_ICON } from "../constants/gov";
import { SEA_LEVEL, formatDate } from "../constants/market";
import { getApiErrorMessage } from "../api/errorMessage";

const EMPTY = {
  regions: [] as string[],
  forecast: null as any,
  error: "",
  alerts: [] as any[],
  zones: null as any,
};

const QUICK_KINDS = ["CHUVA", "SECA", "TEMPESTADE", "INUNDACAO", "AGRICOLA", "MARITIMO", "EMERGENCIA"];

function icon(code: number) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

function val(value: any, suffix: string) {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

// Clima e alertas para as instituições públicas: previsão, mar e alertas oficiais
export default function GovWeatherScreen({ navigation }: any) {
  const catalog = useGovCatalog();
  const [region, setRegion] = useState("");

  const loader = useLoader(
    async () => {
      const [regions, forecast, alerts, zones] = await Promise.all([
        getWeatherRegions().catch(() => [] as string[]),
        getForecast(region || undefined)
          .then((data: any) => ({ data, error: "" }))
          .catch((e: any) => ({ data: null, error: getApiErrorMessage(e, "Não foi possível obter a previsão do tempo.") })),
        listAlerts({ region: region || undefined }).catch(() => ({ items: [] as any[] })),
        getSeaZones().catch(() => null),
      ]);
      return { regions, forecast: forecast.data, error: forecast.error, alerts: (alerts as any).items, zones };
    },
    EMPTY,
    [region]
  );
  const d: any = loader.data;
  const f: any = d.forecast;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const regionKey = regionKeyOfTown(f?.region ?? region);
  const zones: any[] = d.zones?.zones ?? [];
  const worried = zones.filter((z) => z.available && z.level && z.level !== "SEGURO");

  function createAlert(preset: Record<string, any>) {
    navigation.navigate("GovAlertForm", { ...preset, regions: preset.regions ?? (regionKey ? [regionKey] : undefined) });
  }

  return (
    <Page loader={loader}>
      <Title>🌦️ Clima e alertas</Title>
      <Text style={u.muted}>Previsão do tempo, condições do mar e alertas oficiais. Daqui cria alertas para a população.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="📍 A minha região" active={region === ""} onPress={() => setRegion("")} />
        {d.regions.map((r: string) => (
          <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
        ))}
      </ScrollView>

      <SubTitle>🚨 Alertas oficiais ativos</SubTitle>
      {d.alerts.length === 0 ? (
        <Text style={u.muted}>Não há alertas oficiais ativos para esta região.</Text>
      ) : (
        d.alerts.slice(0, 4).map((a: any) => <AlertCard key={a.id} alert={a} catalog={catalog} onPress={() => navigation.navigate("GovAlert", { id: a.id })} />)
      )}
      <View style={u.row}>
        <Btn small kind="outline" label="Ver todos os alertas" onPress={() => navigation.navigate("GovAlerts")} />
        <Btn small kind="outline" label="🆘 Pedidos de socorro no mar" onPress={() => navigation.navigate("RescueSos")} />
      </View>

      <SubTitle>➕ Criar um alerta</SubTitle>
      <View style={u.row}>
        {QUICK_KINDS.map((k) => (
          <Btn
            key={k}
            small
            kind={k === "EMERGENCIA" ? "danger" : "outline"}
            label={`${ALERT_KIND_ICON[k]} ${catalog.alertKinds.find((x) => x.value === k)?.label ?? k}`}
            onPress={() => createAlert({ kind: k, severity: k === "EMERGENCIA" ? "EMERGENCIA" : "ATENCAO" })}
          />
        ))}
      </View>

      {d.error ? <Empty text={d.error} /> : null}

      {f ? (
        <>
          <Text style={[u.muted, { marginTop: 10 }]}>Região da previsão: {f.region}</Text>
          {!f.known ? <Text style={u.muted}>Não reconhecemos a região, por isso mostramos {f.region}. Escolha uma acima.</Text> : null}

          {f.current ? (
            <Card>
              <Text style={u.strong}>Agora em {f.region}</Text>
              <Text style={{ fontSize: 32, marginTop: 4 }}>{Math.round(f.current.temperature)} °C</Text>
              <Text style={u.muted}>{f.current.description}</Text>
              <Text style={u.muted}>
                💧 Humidade {Math.round(f.current.humidity)}% · 💨 Vento {Math.round(f.current.wind)} km/h · 🌧️ Chuva {f.current.rain} mm
              </Text>
            </Card>
          ) : null}

          <SubTitle>⚠️ Avisos da previsão</SubTitle>
          {f.alerts.auto.length === 0 && f.alerts.weather.length === 0 && f.alerts.agricultural.length === 0 ? (
            <Text style={u.muted}>Nenhum aviso para os próximos 7 dias.</Text>
          ) : (
            <>
              {f.alerts.auto.map((a: any, i: number) => {
                const preset = alertFromForecast(a);
                return (
                  <Card key={`${a.title}-${a.date}-${i}`}>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.title}</Text>
                      <Badge label={a.kind === "AGRICOLA" ? "Agrícola" : "Meteorológico"} color={a.level === "ALTA" ? "#C62828" : "#F9A825"} />
                    </View>
                    <Text style={u.muted}>{a.detail}</Text>
                    <Btn small kind="outline" label="🚨 Criar alerta oficial com isto" onPress={() => createAlert(preset)} />
                  </Card>
                );
              })}
              {[...f.alerts.weather, ...f.alerts.agricultural].map((a: any) => (
                <Card key={a.id}>
                  <Text style={u.strong}>📢 {a.title}</Text>
                  {a.description ? <Text style={u.muted}>{a.description}</Text> : null}
                  <Text style={u.muted}>Registado pela equipa do app</Text>
                </Card>
              ))}
            </>
          )}

          <SubTitle>🗓️ {f.season.name}</SubTitle>
          <Card>
            <Text>{f.season.tip}</Text>
          </Card>

          <SubTitle>Previsão dos próximos 7 dias</SubTitle>
          {f.days.map((day: any) => (
            <Card key={day.date}>
              <View style={u.between}>
                <Text style={u.strong}>
                  {icon(day.code)} {day.weekday} · {formatDate(`${day.date}T12:00:00`)}
                </Text>
                {day.storm ? <Badge label="Tempestade" color="#C62828" /> : null}
              </View>
              <Text style={u.muted}>{day.description}</Text>
              <Text style={u.muted}>
                🌡️ {day.tmin !== null ? Math.round(day.tmin) : "—"}° a {day.tmax !== null ? Math.round(day.tmax) : "—"}°C
              </Text>
              <Text style={u.muted}>
                🌧️ Chuva {Math.round(day.rain)} mm ({Math.round(day.rainProbability)}%) · 💨 Vento {Math.round(day.wind)} km/h
              </Text>
            </Card>
          ))}
          <Text style={u.muted}>Previsão fornecida por Open-Meteo. Use como orientação e confirme antes de emitir alertas oficiais.</Text>
        </>
      ) : null}

      <SubTitle>⚓ Condições do mar</SubTitle>
      {!d.zones ? (
        <Text style={u.muted}>Não foi possível carregar as zonas do mar agora.</Text>
      ) : (
        <>
          {zones.map((z: any) => {
            const level = z.level ? SEA_LEVEL[z.level] : null;
            return (
              <Card key={z.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{z.name}</Text>
                  {level ? <Badge label={level.label} color={level.color} /> : null}
                </View>
                {z.available ? (
                  <>
                    <Text style={u.muted}>
                      🌊 Ondas {val(z.waveHeight, " m")} · 💨 Vento {val(z.wind, " km/h")} · rajadas {val(z.gust, " km/h")}
                    </Text>
                    {z.reasons?.map((r: string, i: number) => (
                      <Text key={i} style={u.muted}>
                        • {r}
                      </Text>
                    ))}
                  </>
                ) : (
                  <Text style={u.muted}>Sem dados agora.</Text>
                )}
                {z.available && z.level && z.level !== "SEGURO" ? (
                  <Btn
                    small
                    kind="outline"
                    label="⚓ Criar alerta marítimo"
                    onPress={() =>
                      createAlert({
                        kind: "MARITIMO",
                        severity: z.level === "PERIGOSO" ? "ALERTA" : "ATENCAO",
                        title: `Mar difícil: ${z.name}`,
                        message: `${(z.reasons ?? []).join(" ")} Embarcações pequenas devem evitar sair.`.trim(),
                        regions: ZONE_TO_REGIONS[z.id],
                      })
                    }
                  />
                ) : null}
              </Card>
            );
          })}
          {worried.length === 0 && zones.length > 0 ? <Text style={u.muted}>Nenhuma zona com condições difíceis agora.</Text> : null}
          {d.zones.notice ? <Text style={u.muted}>{d.zones.notice}</Text> : null}
        </>
      )}
    </Page>
  );
}
