import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Linking, Alert, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { TransporterLayout } from "../components/TransporterTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getTransporterMap } from "../api/transporter";
import { getPosition } from "../utils/location";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { PLACE_STATUS_COLOR, SEVERITY_COLOR } from "../constants/gov";
import { distanceKm, kmText } from "../constants/agentSupport";
import { PHASE_COLOR } from "../constants/transporter";
import { minutesText } from "../constants/agentOps";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  bounds: { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 },
  points: [] as any[],
  deliveries: [] as any[],
  unplaced: 0,
  regions: [] as any[],
  note: "",
};

const LAYERS = [
  { key: "available", label: "🆕 Entregas disponíveis", color: "#1565C0" },
  { key: "mine", label: "🚚 As minhas entregas", color: "#EF6C00" },
  { key: "markets", label: "🛒 Mercados", color: "#F9A825" },
  { key: "infra", label: "🏗️ Armazéns, portos e estradas", color: "#6A1B9A" },
];

const POSITION_COLOR = "#C62828";

const METRICS: [string, string][] = [
  ["available", "🆕 Entregas disponíveis"],
  ["active", "🚚 As minhas entregas"],
  ["markets", "🛒 Mercados"],
  ["infrastructures", "🏗️ Infraestruturas"],
  ["damaged", "⚠️ Locais danificados"],
  ["alerts", "🚨 Alertas oficiais"],
];

type Selected = { kind: "point" | "region"; id: string } | null;

function regionValue(r: any, metric: string): number {
  if (metric === "alerts") return r.alerts?.active ?? 0;
  return Number(r[metric]) || 0;
}

function pointKey(p: any): string {
  return `${p.layer}:${p.id}:${p.role ?? ""}`;
}

function layerOf(p: any): string {
  return p.layer === "position" ? "mine" : p.layer;
}

function routeTo(p: { lat: number; lng: number }) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`);
}

function Line({ a, b, color }: { a: { x: number; y: number }; b: { x: number; y: number }; color: string }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: (a.x + b.x) / 2 - length / 2,
        top: (a.y + b.y) / 2 - 1,
        width: length,
        height: 3,
        backgroundColor: color,
        opacity: 0.7,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export default function TransporterMapScreen({ navigation }: any) {
  const gov = useGovCatalog();
  const { width } = useWindowDimensions();
  const W = Math.max(260, width - 32);

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [layers, setLayers] = useState<string[]>(LAYERS.map((l) => l.key));
  const [metric, setMetric] = useState("available");
  const [selected, setSelected] = useState<Selected>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const loader = useLoader(() => getTransporterMap({ scope: scope === "all" ? "all" : "" }), EMPTY, [scope]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const b = d.bounds;
  const H = Math.round(W * ((b.maxLat - b.minLat) / (b.maxLng - b.minLng)) * 1.15);

  function toXY(lat: number, lng: number) {
    const x = ((lng - b.minLng) / (b.maxLng - b.minLng)) * W;
    const y = ((b.maxLat - lat) / (b.maxLat - b.minLat)) * H;
    return { x: Math.min(W - 10, Math.max(10, x)), y: Math.min(H - 10, Math.max(10, y)) };
  }

  function toggleLayer(key: string) {
    setLayers((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function locate() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setHere(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app para ver o que está perto de si.");
    }
  }

  const colorOf = (p: any) => (p.layer === "position" ? POSITION_COLOR : LAYERS.find((l) => l.key === layerOf(p))?.color ?? "#757575");

  // Pontos no mesmo sítio abrem-se em círculo para se poderem tocar
  const visible: any[] = (d.points as any[]).filter((p) => layers.includes(layerOf(p)));
  const groups = new Map<string, any[]>();
  visible.forEach((p) => {
    const key = `${Number(p.lat).toFixed(3)},${Number(p.lng).toFixed(3)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  });

  const placed: { p: any; x: number; y: number }[] = [];
  groups.forEach((list) =>
    list.forEach((p, i) => {
      const base = toXY(p.lat, p.lng);
      const n = list.length;
      const radius = n === 1 ? 0 : 12 + Math.max(0, n - 6) * 1.5;
      const angle = (2 * Math.PI * i) / n;
      placed.push({ p, x: base.x + radius * Math.cos(angle), y: base.y + radius * Math.sin(angle) });
    })
  );

  const regions: any[] = d.regions;
  const maxMetric = Math.max(1, ...regions.map((r) => regionValue(r, metric)));

  const selectedPoint = selected?.kind === "point" ? (d.points as any[]).find((p) => pointKey(p) === selected.id) : null;
  const selectedRegion = selected?.kind === "region" ? regions.find((r) => r.key === selected.id) : null;

  // Linha entre a recolha e o destino da entrega escolhida
  let line: { a: { x: number; y: number }; b: { x: number; y: number }; color: string } | null = null;
  if (selectedPoint && (selectedPoint.layer === "available" || selectedPoint.layer === "mine")) {
    const pair = (d.points as any[]).filter((p) => p.layer === selectedPoint.layer && p.id === selectedPoint.id);
    const from = pair.find((p) => p.role === "recolha");
    const to = pair.find((p) => p.role === "destino");
    if (from && to) line = { a: toXY(from.lat, from.lng), b: toXY(to.lat, to.lng), color: colorOf(selectedPoint) };
  }

  const nearby = here
    ? (d.points as any[])
        .filter((p) => (p.layer === "available" && p.role === "recolha") || p.layer === "markets" || p.layer === "infra")
        .map((p) => ({ p, km: distanceKm(here.lat, here.lng, p.lat, p.lng) }))
        .sort((x, y) => x.km - y.km)
        .slice(0, 8)
    : [];

  const activeRegions = regions.filter(
    (r) => r.available + r.active + r.markets + r.infrastructures + (r.alerts?.active ?? 0) > 0
  );

  function pointTitle(p: any): string {
    if (p.layer === "available") return p.role === "recolha" ? "Recolha de uma entrega disponível" : "Destino de uma entrega disponível";
    if (p.layer === "mine") return p.role === "recolha" ? "Recolha de uma entrega minha" : "Destino de uma entrega minha";
    if (p.layer === "position") return "A minha última posição";
    if (p.layer === "markets") return "Mercado";
    return labelOf(gov.placeSubtypes.INFRAESTRUTURA ?? [], p.subtype) || "Infraestrutura";
  }

  function pointCard(p: any) {
    const isDelivery = p.layer === "available" || p.layer === "mine" || p.layer === "position";
    const status = !isDelivery && p.status ? { label: labelOf(gov.placeStatus, p.status), color: PLACE_STATUS_COLOR[p.status] ?? "#757575" } : null;

    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{isDelivery ? `Entrega ${p.orderCode}` : p.name}</Text>
          {status ? <Badge label={status.label} color={status.color} /> : null}
          {p.phase ? <Badge label={p.phase === "EM_TRANSPORTE" ? "Em transporte" : "Aceite"} color={PHASE_COLOR[p.phase] ?? "#757575"} /> : null}
        </View>
        <Text style={u.muted}>{pointTitle(p)}</Text>
        {isDelivery && p.text ? <Text style={{ marginTop: 4 }}>📍 {p.text}</Text> : null}
        {p.layer === "available" ? (
          <Text style={{ fontWeight: "bold", color: colors.primary, marginTop: 2 }}>{p.payout ? `💰 ${money(p.payout)}` : "💰 Valor a combinar"}</Text>
        ) : null}
        {p.layer === "position" && p.at ? <Text style={u.muted}>Partilhada {minutesText(Math.max(0, Math.floor((Date.now() - new Date(p.at).getTime()) / 60000)))}</Text> : null}
        {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
        {p.schedule ? <Text style={u.muted}>🕒 {p.schedule}</Text> : null}
        {p.status === "DANIFICADA" ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ Local danificado: pode afetar o caminho.</Text> : null}
        {p.approximate ? <Text style={u.muted}>Posição aproximada (centro da região).</Text> : null}

        <View style={u.row}>
          <Btn small label={p.approximate ? "🧭 Rota até à região" : "🧭 Rota"} onPress={() => routeTo(p)} />
          {isDelivery ? <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TransporterDelivery", { id: p.id })} /> : null}
          {p.layer === "markets" || p.layer === "infra" ? <Btn small kind="outline" label="Abrir o local" onPress={() => navigation.navigate("GovPlace", { id: p.id })} /> : null}
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  function regionCard(r: any) {
    const rows: [string, number][] = [
      ["🆕 Entregas disponíveis", r.available],
      ["🚚 As minhas entregas", r.active],
      ["🛒 Mercados", r.markets],
      ["🏗️ Armazéns, portos e estradas", r.infrastructures],
    ];

    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🗺️ {r.name}</Text>
          {r.mine ? <Badge label="A sua região" color="#00838F" /> : null}
        </View>

        {(r.alerts?.active ?? 0) > 0 ? (
          <Text style={{ color: SEVERITY_COLOR[r.alerts.maxSeverity] ?? "#EF6C00", marginTop: 4, fontWeight: "bold" }}>
            🚨 {r.alerts.active} alerta(s) oficial(is) ativo(s): pode afetar as estradas
          </Text>
        ) : null}
        {r.damaged > 0 ? <Text style={{ color: "#C62828" }}>⚠️ {r.damaged} local(is) danificado(s)</Text> : null}

        {rows.map(([label, value]) => (
          <View key={label} style={[u.between, { marginTop: 4 }]}>
            <Text>{label}</Text>
            <Text style={{ fontWeight: "bold" }}>{value}</Text>
          </View>
        ))}

        <View style={u.row}>
          <Btn small label="📦 Ver entregas" onPress={() => navigation.navigate("TransporterDeliveries", { tab: "available" })} />
          <Btn small kind="outline" label="🧭 Rota até à região" onPress={() => routeTo(r)} />
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  return (
    <TransporterLayout active="TransporterMap">
      <Page loader={loader}>
        <Title>🗺️ Mapa</Title>
        <Text style={u.muted}>
          As entregas disponíveis e as suas, mercados, armazéns, portos e estradas. Toque num ponto: para uma entrega, vê a linha da recolha ao destino.
        </Text>

        <View style={u.row}>
          <Chip label="Minhas regiões" active={scope === "mine"} onPress={() => setScope("mine")} />
          <Chip label="Todo o país" active={scope === "all"} onPress={() => setScope("all")} />
        </View>

        <Text style={u.label}>O que mostrar no mapa</Text>
        <View style={u.row}>
          {LAYERS.map((l) => (
            <Chip key={l.key} label={l.label} active={layers.includes(l.key)} onPress={() => toggleLayer(l.key)} />
          ))}
        </View>

        <Text style={u.label}>Números nas regiões</Text>
        <View style={u.row}>
          <Chip label="Nenhum" active={metric === ""} onPress={() => setMetric("")} />
          {METRICS.map(([key, label]) => (
            <Chip key={key} label={label} active={metric === key} onPress={() => setMetric(key)} />
          ))}
        </View>

        <View
          style={{
            width: W,
            height: H,
            marginTop: 10,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#E3F2FD",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ position: "absolute", left: 8, bottom: 6, fontSize: 10, color: "#78909C" }}>Oceano Atlântico</Text>
          <Text style={{ position: "absolute", right: 8, top: 6, fontSize: 11, color: "#78909C" }}>N ↑</Text>

          {metric
            ? regions.map((r) => {
                const value = regionValue(r, metric);
                if (value <= 0) return null;
                const { x, y } = toXY(r.lat, r.lng);
                const size = 22 + Math.round((value / maxMetric) * 26);
                const color = metric === "alerts" ? `${SEVERITY_COLOR[r.alerts?.maxSeverity] ?? "#EF6C00"}59` : metric === "damaged" ? "rgba(198,40,40,0.35)" : "rgba(0,131,143,0.35)";
                return (
                  <TouchableOpacity
                    key={`bubble-${r.key}`}
                    activeOpacity={0.8}
                    onPress={() => setSelected({ kind: "region", id: r.key })}
                    style={{
                      position: "absolute",
                      left: x - size / 2,
                      top: y - size / 2,
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#263238" }}>{value}</Text>
                  </TouchableOpacity>
                );
              })
            : null}

          {regions.map((r) => {
            const { x, y } = toXY(r.lat, r.lng);
            return (
              <TouchableOpacity
                key={`label-${r.key}`}
                activeOpacity={0.7}
                onPress={() => setSelected({ kind: "region", id: r.key })}
                style={{ position: "absolute", left: Math.max(2, Math.min(W - 70, x - 30)), top: Math.min(H - 14, y + 12), width: 60, alignItems: "center" }}
              >
                <Text style={{ fontSize: 9, color: r.mine ? "#00838F" : "#455A64", fontWeight: r.mine ? "bold" : "normal", textAlign: "center" }} numberOfLines={1}>
                  {r.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {line ? <Line a={line.a} b={line.b} color={line.color} /> : null}

          {placed.map(({ p, x, y }) => {
            const key = pointKey(p);
            const active = selected?.kind === "point" && selected.id === key;
            const size = active ? 24 : p.role === "destino" ? 14 : 18;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                onPress={() => setSelected({ kind: "point", id: key })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: "absolute",
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: p.role === "destino" ? 3 : size / 2,
                  backgroundColor: colorOf(p),
                  borderWidth: 2,
                  borderColor: active ? "#263238" : p.status === "DANIFICADA" ? "#C62828" : "#FFFFFF",
                  opacity: p.approximate ? 0.85 : 1,
                }}
              />
            );
          })}

          {here ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: toXY(here.lat, here.lng).x - 8,
                top: toXY(here.lat, here.lng).y - 8,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: "#00C853",
                borderWidth: 3,
                borderColor: "#FFFFFF",
              }}
            />
          ) : null}
        </View>

        <View style={[u.row, { marginTop: 6 }]}>
          {LAYERS.map((l) => (
            <View key={l.key} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color, marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{l.label.slice(3)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: POSITION_COLOR, marginRight: 4 }} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>A minha posição</Text>
          </View>
        </View>
        <Text style={[u.muted, { marginTop: 4 }]}>
          Círculo: recolha. Quadrado: destino. Mapa esquemático das regiões: pontos sem coordenadas ficam no centro da região. Para o caminho real, toque em "Rota" e abre o Google Maps.
        </Text>

        {selectedPoint ? pointCard(selectedPoint) : null}
        {selectedRegion ? regionCard(selectedRegion) : null}

        <SubTitle>Perto de mim</SubTitle>
        <Btn
          small
          kind="outline"
          label={locating ? "A procurar o sinal GPS..." : here ? "📡 Atualizar a minha posição" : "📡 Mostrar o que está perto de mim"}
          onPress={locate}
          disabled={locating}
        />
        {here && nearby.length === 0 ? <Empty text="Não há entregas, mercados ou infraestruturas registados." /> : null}
        {nearby.map(({ p, km }) => (
          <TouchableOpacity key={pointKey(p)} activeOpacity={0.85} onPress={() => setSelected({ kind: "point", id: pointKey(p) })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.layer === "available" ? `Entrega ${p.orderCode}` : p.name}</Text>
                <Badge label={`${p.approximate ? "≈ " : ""}${kmText(km)}`} color="#00838F" />
              </View>
              <Text style={u.muted}>
                {pointTitle(p)}
                {p.region ? ` · 📍 ${p.region}` : ""}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        <SubTitle>Regiões</SubTitle>
        {activeRegions.length === 0 ? (
          <Empty text="Ainda não há entregas, mercados ou infraestruturas registados." />
        ) : (
          activeRegions.map((r) => (
            <TouchableOpacity key={r.key} activeOpacity={0.85} onPress={() => setSelected({ kind: "region", id: r.key })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.name}</Text>
                  {(r.alerts?.active ?? 0) > 0 ? <Badge label={`🚨 ${r.alerts.active}`} color={SEVERITY_COLOR[r.alerts.maxSeverity] ?? "#EF6C00"} /> : null}
                </View>
                <Text style={u.muted}>
                  🆕 {r.available} disponível(eis) · 🚚 {r.active} minha(s) · 🛒 {r.markets} mercado(s) · 🏗️ {r.infrastructures}
                </Text>
                {r.damaged > 0 ? <Text style={{ color: "#C62828" }}>⚠️ {r.damaged} local(is) danificado(s)</Text> : null}
              </Card>
            </TouchableOpacity>
          ))
        )}

        {d.unplaced > 0 ? <Text style={[u.muted, { marginTop: 6 }]}>{d.unplaced} item(ns) sem região reconhecida não aparecem no mapa.</Text> : null}

        <View style={u.row}>
          <Btn small kind="outline" label="📦 Entregas" onPress={() => navigation.navigate("TransporterDeliveries", { tab: "available" })} />
          <Btn small kind="outline" label="🚨 Alertas oficiais" onPress={() => navigation.navigate("GovAlerts")} />
          <Btn small kind="outline" label="🌦️ Clima" onPress={() => navigation.navigate("GovWeather")} />
        </View>

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
      </Page>
    </TransporterLayout>
  );
}
