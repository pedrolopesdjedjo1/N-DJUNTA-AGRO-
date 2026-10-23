import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getGovMap } from "../api/gov";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { PLACE_STATUS_COLOR, SERVICE_STATUS_COLOR, SEVERITY_COLOR } from "../constants/gov";
import { formatNumber } from "../utils/format";
import { formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  bounds: { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 },
  points: [] as any[],
  unplaced: 0,
  regions: [] as any[],
  unmatched: { farmers: 0, fishers: 0, artisans: 0, cooperatives: 0 },
  note: "",
};

const LAYERS = [
  { key: "projects", label: "📋 Projetos", color: "#1565C0" },
  { key: "communities", label: "🏘️ Comunidades", color: "#2E7D32" },
  { key: "trainings", label: "📚 Centros de formação", color: "#6A1B9A" },
  { key: "infra", label: "🏗️ Infraestruturas", color: "#EF6C00" },
  { key: "markets", label: "🛒 Mercados", color: "#F9A825" },
  { key: "zones", label: "🌾 Zonas de produção", color: "#558B2F" },
  { key: "services", label: "🏛️ Serviços públicos", color: "#00838F" },
];

const METRICS: [string, string][] = [
  ["reports", "📝 Pedidos em aberto"],
  ["alerts", "🚨 Alertas ativos"],
  ["needs", "📍 Necessidades"],
  ["damaged", "⚠️ Locais danificados"],
  ["farmers", "🌾 Agricultores"],
  ["fishers", "🎣 Pescadores"],
  ["artisans", "🧺 Artesãos"],
  ["cooperatives", "🤝 Cooperativas"],
  ["projects", "📋 Projetos"],
  ["beneficiaries", "👥 Beneficiários"],
];

type Selected = { kind: "point" | "region"; id: string } | null;

function layerKey(p: any): string {
  if (p.layer === "places") return p.kind === "INFRAESTRUTURA" ? "infra" : p.kind === "MERCADO" ? "markets" : "zones";
  return p.layer;
}

function regionValue(r: any, metric: string): number {
  switch (metric) {
    case "reports":
      return r.reports?.open ?? 0;
    case "alerts":
      return r.alerts?.active ?? 0;
    case "needs":
      return r.needs?.open ?? 0;
    case "damaged":
      return r.places?.damaged ?? 0;
    case "":
      return 0;
    default:
      return r[metric] ?? 0;
  }
}

export default function GovMapScreen({ navigation }: any) {
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();
  const { width } = useWindowDimensions();
  const W = Math.max(260, width - 32);

  const [layers, setLayers] = useState<string[]>(LAYERS.map((l) => l.key));
  const [metric, setMetric] = useState("reports");
  const [selected, setSelected] = useState<Selected>(null);

  const loader = useLoader(() => getGovMap({}), EMPTY);
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

  const layerColor = (key: string) => LAYERS.find((l) => l.key === key)?.color ?? "#757575";

  // Pontos no mesmo sítio abrem-se em círculo para se poderem tocar
  const visible: any[] = (d.points as any[]).filter((p) => layers.includes(layerKey(p)));
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

  const selectedPoint = selected?.kind === "point" ? (d.points as any[]).find((p) => `${p.layer}:${p.id}` === selected.id) : null;
  const selectedRegion = selected?.kind === "region" ? regions.find((r) => r.key === selected.id) : null;

  function openGoogle(lat: number, lng: number) {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  }

  function bubbleColor(r: any): string {
    if (metric === "alerts") {
      const sev = r.alerts?.maxSeverity;
      return `${SEVERITY_COLOR[sev] ?? "#F9A825"}59`;
    }
    if (metric === "reports" || metric === "damaged") return (r.reports?.urgent ?? 0) > 0 ? "rgba(198,40,40,0.35)" : "rgba(239,108,0,0.35)";
    if (metric === "needs") return "rgba(239,108,0,0.35)";
    return "rgba(0,131,143,0.35)";
  }

  const activeRegions = regions
    .filter(
      (r) =>
        regionValue(r, "reports") +
          regionValue(r, "alerts") +
          regionValue(r, "needs") +
          regionValue(r, "damaged") +
          (r.farmers ?? 0) +
          (r.fishers ?? 0) +
          (r.artisans ?? 0) +
          (r.cooperatives ?? 0) +
          (r.projects ?? 0) +
          (r.communities ?? 0) +
          (r.beneficiaries ?? 0) >
        0
    )
    .sort(
      (a, c) =>
        (c.reports?.urgent ?? 0) - (a.reports?.urgent ?? 0) ||
        (c.alerts?.active ?? 0) - (a.alerts?.active ?? 0) ||
        (c.places?.damaged ?? 0) - (a.places?.damaged ?? 0) ||
        (c.reports?.open ?? 0) - (a.reports?.open ?? 0) ||
        a.name.localeCompare(c.name)
    );

  const unmatchedTotal = d.unmatched.farmers + d.unmatched.fishers + d.unmatched.artisans + d.unmatched.cooperatives;

  function pointCard(p: any) {
    const status =
      p.layer === "projects"
        ? { label: labelOf(ngo.projectStatus, p.status), color: colorOf(PROJECT_STATUS_COLOR, p.status) }
        : p.layer === "places"
        ? { label: labelOf(gov.placeStatus, p.status), color: PLACE_STATUS_COLOR[p.status] ?? "#757575" }
        : p.layer === "services"
        ? { label: labelOf(gov.serviceStatus, p.status), color: SERVICE_STATUS_COLOR[p.status] ?? "#757575" }
        : null;

    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
          {status ? <Badge label={status.label} color={status.color} /> : null}
        </View>

        {p.layer === "projects" ? <Text style={u.muted}>📋 Projeto · {labelOf(ngo.areas, p.area)}</Text> : null}
        {p.layer === "communities" ? (
          <Text style={u.muted}>
            🏘️ {labelOf(ngo.communityTypes, p.type)}
            {p.population ? ` · ${formatNumber(p.population)} habitantes` : ""}
          </Text>
        ) : null}
        {p.layer === "trainings" ? (
          <Text style={u.muted}>
            📚 {labelOf(ngo.trainingKinds, p.kind)} · {formatDateTime(p.startsAt)}
          </Text>
        ) : null}
        {p.layer === "places" ? (
          <Text style={u.muted}>
            {labelOf(gov.placeKinds, p.kind)} · {labelOf(gov.placeSubtypes[p.kind] ?? [], p.subtype)}
          </Text>
        ) : null}
        {p.layer === "services" ? <Text style={u.muted}>🏛️ {labelOf(gov.serviceCategories, p.category)}</Text> : null}

        {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
        {p.approximate ? <Text style={u.muted}>Posição aproximada (centro da região).</Text> : null}
        {p.layer === "projects" && !p.isMine ? <Text style={u.muted}>Projeto público de outra instituição.</Text> : null}

        <View style={u.row}>
          {p.layer === "projects" ? (
            <Btn small label="Abrir projeto" onPress={() => navigation.navigate(p.isMine ? "NgoProject" : "NgoPublicProject", { id: p.id })} />
          ) : null}
          {p.layer === "communities" ? <Btn small label="Abrir comunidade" onPress={() => navigation.navigate("NgoCommunity", { id: p.id })} /> : null}
          {p.layer === "trainings" ? (
            <Btn small label="Abrir formação" onPress={() => navigation.navigate(p.isMine ? "NgoTraining" : "NgoTrainingPublic", { id: p.id })} />
          ) : null}
          {p.layer === "places" ? <Btn small label="Abrir local" onPress={() => navigation.navigate("GovPlace", { id: p.id })} /> : null}
          {p.layer === "services" ? <Btn small label="Abrir serviço" onPress={() => navigation.navigate("GovService", { id: p.id })} /> : null}
          <Btn small kind="outline" label={p.approximate ? "Região no Google Maps" : "Abrir no Google Maps"} onPress={() => openGoogle(p.lat, p.lng)} />
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  function regionCard(r: any) {
    const rows: [string, number][] = [
      ["🌾 Agricultores no app", r.farmers ?? 0],
      ["🎣 Pescadores no app", r.fishers ?? 0],
      ["🧺 Artesãos no app", r.artisans ?? 0],
      ["🤝 Cooperativas", r.cooperatives ?? 0],
      ["📋 Projetos públicos", r.projects ?? 0],
      ["🏘️ As suas comunidades", r.communities ?? 0],
      ["👥 Os seus beneficiários", r.beneficiaries ?? 0],
      ["🏗️ Infraestruturas", r.places?.infrastructures ?? 0],
      ["🛒 Mercados", r.places?.markets ?? 0],
      ["🌾 Zonas de produção", r.places?.zones ?? 0],
      ["🏛️ Serviços públicos", r.services ?? 0],
    ];

    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🗺️ {r.name}</Text>
          {(r.reports?.urgent ?? 0) > 0 ? <Badge label={`${r.reports.urgent} pedido(s) urgente(s)`} color="#C62828" /> : null}
        </View>

        {(r.alerts?.active ?? 0) > 0 ? (
          <Text style={{ color: SEVERITY_COLOR[r.alerts.maxSeverity] ?? "#EF6C00", marginTop: 4, fontWeight: "bold" }}>
            🚨 {r.alerts.active} alerta(s) oficial(is) ativo(s)
          </Text>
        ) : null}

        <Text style={[u.strong, { marginTop: 8 }]}>
          📝 Pedidos em aberto: {r.reports?.open ?? 0} · 📍 Necessidades: {r.needs?.open ?? 0}
        </Text>
        {(r.places?.damaged ?? 0) > 0 ? <Text style={{ color: "#C62828" }}>⚠️ {r.places.damaged} local(is) danificado(s)</Text> : null}

        {rows.map(([label, value]) => (
          <View key={label} style={[u.between, { marginTop: 4 }]}>
            <Text>{label}</Text>
            <Text style={{ fontWeight: "bold" }}>{formatNumber(value)}</Text>
          </View>
        ))}

        <View style={u.row}>
          <Btn small label="🚨 Criar alerta aqui" onPress={() => navigation.navigate("GovAlertForm", { regions: [r.key] })} />
          <Btn small kind="outline" label="📊 Estatísticas" onPress={() => navigation.navigate("GovData", { region: r.key })} />
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="Região no Google Maps" onPress={() => openGoogle(r.lat, r.lng)} />
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  return (
    <Page loader={loader}>
      <Title>📍 Mapa do território</Title>
      <Text style={u.muted}>
        Projetos, comunidades, centros de formação, infraestruturas, mercados, zonas de produção e serviços públicos, com os números por região. Toque num ponto ou numa região.
      </Text>

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
                    backgroundColor: bubbleColor(r),
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
              <Text style={{ fontSize: 9, color: "#455A64", textAlign: "center" }} numberOfLines={1}>
                {r.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {placed.map(({ p, x, y }) => {
          const id = `${p.layer}:${p.id}`;
          const active = selected?.kind === "point" && selected.id === id;
          const size = active ? 24 : 18;
          const damaged = p.layer === "places" && p.status === "DANIFICADA";
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.8}
              onPress={() => setSelected({ kind: "point", id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                position: "absolute",
                left: x - size / 2,
                top: y - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: layerColor(layerKey(p)),
                borderWidth: 2,
                borderColor: active ? "#263238" : damaged ? "#C62828" : "#FFFFFF",
                opacity: p.approximate ? 0.85 : 1,
              }}
            />
          );
        })}
      </View>

      <View style={[u.row, { marginTop: 6 }]}>
        {LAYERS.map((l) => (
          <View key={l.key} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color, marginRight: 4 }} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{l.label.slice(3)}</Text>
          </View>
        ))}
      </View>
      <Text style={[u.muted, { marginTop: 4 }]}>
        Mapa esquemático das regiões. Pontos sem coordenadas ficam no centro da região. Contorno vermelho: local danificado. Para o mapa real, use "Abrir no Google Maps".
      </Text>

      {selectedPoint ? pointCard(selectedPoint) : null}
      {selectedRegion ? regionCard(selectedRegion) : null}

      {d.unplaced > 0 ? (
        <Text style={[u.muted, { marginTop: 6 }]}>{d.unplaced} item(ns) sem região reconhecida não aparecem no mapa. Edite-os e escolha a região.</Text>
      ) : null}

      <SubTitle>Regiões</SubTitle>
      {activeRegions.length === 0 ? (
        <Empty text="Ainda não há dados por região. Registe projetos, locais e serviços para ver o mapa." />
      ) : (
        activeRegions.map((r) => (
          <TouchableOpacity key={r.key} activeOpacity={0.85} onPress={() => setSelected({ kind: "region", id: r.key })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.name}</Text>
                {(r.alerts?.active ?? 0) > 0 ? (
                  <Badge label={`🚨 ${r.alerts.active}`} color={SEVERITY_COLOR[r.alerts.maxSeverity] ?? "#EF6C00"} />
                ) : (r.reports?.urgent ?? 0) > 0 ? (
                  <Badge label={`${r.reports.urgent} urgente(s)`} color="#C62828" />
                ) : (r.reports?.open ?? 0) > 0 ? (
                  <Badge label={`${r.reports.open} pedido(s)`} color="#EF6C00" />
                ) : null}
              </View>
              <Text style={u.muted}>
                🌾 {r.farmers ?? 0} · 🎣 {r.fishers ?? 0} · 🧺 {r.artisans ?? 0} · 🤝 {r.cooperatives ?? 0}
              </Text>
              <Text style={u.muted}>
                📋 {r.projects ?? 0} projeto(s) · 🏗️ {(r.places?.infrastructures ?? 0) + (r.places?.markets ?? 0) + (r.places?.zones ?? 0)} local(is) · 🏛️ {r.services ?? 0} serviço(s)
              </Text>
              {(r.places?.damaged ?? 0) > 0 ? <Text style={{ color: "#C62828" }}>⚠️ {r.places.damaged} local(is) danificado(s)</Text> : null}
            </Card>
          </TouchableOpacity>
        ))
      )}

      {unmatchedTotal > 0 ? (
        <Text style={[u.muted, { marginTop: 8 }]}>
          Há {unmatchedTotal} pessoa(s) e cooperativa(s) no app sem região reconhecida, por isso não entram nestes números.
        </Text>
      ) : null}

      <View style={u.row}>
        <Btn small kind="outline" label="🏗️ Locais" onPress={() => navigation.navigate("GovPlaces")} />
        <Btn small kind="outline" label="🏛️ Serviços" onPress={() => navigation.navigate("GovServices")} />
        <Btn small kind="outline" label="📝 Pedidos" onPress={() => navigation.navigate("GovReports")} />
        <Btn small kind="outline" label="📊 Dados" onPress={() => navigation.navigate("GovData")} />
      </View>

      {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
    </Page>
  );
}
