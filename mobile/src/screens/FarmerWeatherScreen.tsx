import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Chip, Empty, useLoader, u } from "../components/ui";
import { getForecast, getWeatherRegions } from "../api/weather";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { regions: [] as string[], forecast: null as any, error: "" };

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

export default function FarmerWeatherScreen() {
  const [region, setRegion] = useState("");

  const loader = useLoader(
    async () => {
      let regions: string[] = [];
      try {
        regions = await getWeatherRegions();
      } catch (e) {
        regions = [];
      }
      try {
        const forecast = await getForecast(region || undefined);
        return { regions, forecast, error: "" };
      } catch (e) {
        return { regions, forecast: null, error: getApiErrorMessage(e, "Não foi possível obter a previsão do tempo.") };
      }
    },
    EMPTY,
    [region]
  );

  const d: any = loader.data;
  const f: any = d.forecast;

  function levelColor(level: string) {
    return level === "ALTA" ? "#C62828" : "#F9A825";
  }

  return (
    <Page loader={loader}>
      <Title>🌦️ Clima e alertas</Title>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="📍 A minha região" active={region === ""} onPress={() => setRegion("")} />
        {d.regions.map((r: string) => (
          <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
        ))}
      </ScrollView>

      {d.error ? <Empty text={d.error} /> : null}

      {f ? (
        <>
          <Text style={[u.muted, { marginTop: 8 }]}>Região: {f.region}</Text>
          {!f.known ? (
            <Text style={u.muted}>Não reconhecemos a sua região, por isso mostramos {f.region}. Escolha uma região acima.</Text>
          ) : null}

          {f.current ? (
            <Card>
              <Text style={u.strong}>Agora em {f.region}</Text>
              <Text style={{ fontSize: 32, marginTop: 4 }}>
                {Math.round(f.current.temperature)} °C
              </Text>
              <Text style={u.muted}>{f.current.description}</Text>
              <Text style={u.muted}>
                💧 Humidade {Math.round(f.current.humidity)}% · 💨 Vento {Math.round(f.current.wind)} km/h · 🌧️ Chuva {f.current.rain} mm
              </Text>
            </Card>
          ) : null}

          <SubTitle>⚠️ Alertas meteorológicos e agrícolas</SubTitle>
          {f.alerts.auto.length === 0 && f.alerts.weather.length === 0 && f.alerts.agricultural.length === 0 ? (
            <Text style={u.muted}>Nenhum alerta para os próximos dias.</Text>
          ) : (
            <>
              {f.alerts.auto.map((a: any, index: number) => (
                <Card key={`${a.title}-${a.date}-${index}`}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.title}</Text>
                    <Badge label={a.kind === "AGRICOLA" ? "Agrícola" : "Meteorológico"} color={levelColor(a.level)} />
                  </View>
                  <Text style={u.muted}>{a.detail}</Text>
                </Card>
              ))}
              {f.alerts.weather.map((a: any) => (
                <Card key={a.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🌦️ {a.title}</Text>
                    <Badge label="Meteorológico" color="#1565C0" />
                  </View>
                  {a.description ? <Text style={u.muted}>{a.description}</Text> : null}
                </Card>
              ))}
              {f.alerts.agricultural.map((a: any) => (
                <Card key={a.id}>
                  <View style={u.between}>
                    <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🌱 {a.title}</Text>
                    <Badge label="Agrícola" color="#2E7D32" />
                  </View>
                  {a.description ? <Text style={u.muted}>{a.description}</Text> : null}
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

          <SubTitle>🌱 Melhor período para plantação</SubTitle>
          {f.advice.plantingDays.length === 0 ? (
            <Text style={u.muted}>Nenhum dia ideal para plantar nos próximos 7 dias.</Text>
          ) : (
            f.advice.plantingDays.map((a: any) => (
              <Card key={a.date}>
                <Text style={u.strong}>
                  {a.weekday} · {formatDate(`${a.date}T12:00:00`)}
                </Text>
                <Text style={u.muted}>{a.reason}</Text>
              </Card>
            ))
          )}

          <SubTitle>🌾 Melhor período para colheita</SubTitle>
          {f.advice.harvestDays.length === 0 ? (
            <Text style={u.muted}>Nenhum dia ideal para colher nos próximos 7 dias.</Text>
          ) : (
            f.advice.harvestDays.map((a: any) => (
              <Card key={a.date}>
                <Text style={u.strong}>
                  {a.weekday} · {formatDate(`${a.date}T12:00:00`)}
                </Text>
                <Text style={u.muted}>{a.reason}</Text>
              </Card>
            ))
          )}

          <Text style={[u.muted, { marginTop: 12 }]}>
            Previsão fornecida por Open-Meteo. Use como orientação e confirme com os conselhos locais.
          </Text>
        </>
      ) : null}
    </Page>
  );
}
