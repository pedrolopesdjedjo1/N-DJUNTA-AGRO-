import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getNgoMap } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatNumber } from "../utils/format";
import { formatDateTime } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  bounds: { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 },
  scope: "mine",
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
];

const METRICS: [string, string][] = [
  ["needs", "📍 Necessidades"],
  ["farmers", "🌾 Agricultores"],
  ["fishers", "🎣 Pescadores"],
  ["artisans", "🧺 Artesãos"],
  ["cooperatives", "🤝 Cooperativas"],
  ["beneficiaries", "👥 Beneficiários"],
];

type Selected = { kind: "point" | "region"; id: string } | null;

function regionValue(region: any, metric: string): number {
  if (!metric) return 0;
  return metric === "needs" ? region.needs.open : region[metric] ?? 0;
}

export default function NgoMapScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const { width } = useWindowDimensions();
  const W = Math.max(260, width - 32);

  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [layers, setLayers] = useState<string[]>(["projects", "communities", "trainings"]);
  const [metric, setMetric] = useState("needs");
  const [selected, setSelected] = useState<Selected>(null);

  const loader = useLoader(
    () => getNgoMap({ layers: "projects,communities,regions,trainings", scope: scope === "all" ? "all" : "" }),
    EMPTY,
    [scope]
  );

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const d: any = loader.data;
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

  // Pontos que estão no mesmo sítio abrem-se em círculo para se poderem tocar
  const visible: any[] = (d.points as any[]).filter((p) => layers.includes(p.layer));
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
  const layerColor = (key: string) => LAYERS.find((l) => l.key === key)?.color ?? "#757575";

  const selectedPoint = selected?.kind === "point" ? (d.points as any[]).find((p) => `${p.layer}:${p.id}` === selected.id) : null;
  const selectedRegion = selected?.kind === "region" ? regions.find((r) => r.key === selected.id) : null;

  function openGoogle(lat: number, lng: number) {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  }

  const activeRegions = regions
    .filter(
      (r) =>
        r.needs.open + r.farmers + r.fishers + r.artisans + r.cooperatives + r.projects + r.communities + r.beneficiaries > 0
    )
    .sort((a, c) => c.needs.urgent - a.needs.urgent || c.needs.open - a.needs.open || a.name.localeCompare(c.name));

  const unmatchedTotal = d.unmatched.farmers + d.unmatched.fishers + d.unmatched.artisans + d.unmatched.cooperatives;

  function pointCard(p: any) {
    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
          {p.layer === "projects" ? (
            <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
          ) : null}
        </View>

        {p.layer === "projects" ? <Text style={u.muted}>📋 Projeto · {labelOf(catalog.areas, p.area)}</Text> : null}
        {p.layer === "communities" ? (
          <Text style={u.muted}>
            🏘️ {labelOf(catalog.communityTypes, p.type)}
            {p.population ? ` · ${formatNumber(p.population)} habitantes` : ""}
          </Text>
        ) : null}
        {p.layer === "trainings" ? (
          <Text style={u.muted}>
            📚 {labelOf(catalog.trainingKinds, p.kind)} · {formatDateTime(p.startsAt)}
          </Text>
        ) : null}

        {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
        {p.approximate ? <Text style={u.muted}>Posição aproximada (centro da região).</Text> : null}
        {p.layer === "projects" && !p.isMine ? <Text style={u.muted}>Projeto público de outra organização.</Text> : null}

        <View style={u.row}>
          {p.layer === "projects" ? (
            <Btn small label="Abrir projeto" onPress={() => navigation.navigate(p.isMine ? "NgoProject" : "NgoPublicProject", { id: p.id })} />
          ) : null}
          {p.layer === "communities" ? <Btn small label="Abrir comunidade" onPress={() => navigation.navigate("NgoCommunity", { id: p.id })} /> : null}
          {p.layer === "trainings" ? (
            <Btn small label="Abrir formação" onPress={() => navigation.navigate(p.isMine ? "NgoTraining" : "NgoTrainingPublic", { id: p.id })} />
          ) : null}
          <Btn small kind="outline" label={p.approximate ? "Região no Google Maps" : "Abrir no Google Maps"} onPress={() => openGoogle(p.lat, p.lng)} />
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  function regionCard(r: any) {
    const rows: [string, number][] = [
      ["🌾 Agricultores no app", r.farmers],
      ["🎣 Pescadores no app", r.fishers],
      ["🧺 Artesãos no app", r.artisans],
      ["🤝 Cooperativas", r.cooperatives],
      ["📋 Os seus projetos", r.projects],
      ["🏘️ As suas comunidades", r.communities],
      ["👥 Os seus beneficiários", r.beneficiaries],
    ];

    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🗺️ {r.name}</Text>
          {r.needs.urgent > 0 ? <Badge label={`${r.needs.urgent} urgente(s)`} color="#C62828" /> : null}
        </View>

        {rows.map(([label, value]) => (
          <View key={label} style={[u.between, { marginTop: 4 }]}>
            <Text>{label}</Text>
            <Text style={{ fontWeight: "bold" }}>{formatNumber(value)}</Text>
          </View>
        ))}

        <Text style={[u.strong, { marginTop: 8 }]}>📍 Necessidades em aberto: {r.needs.open}</Text>
        {r.needs.byCategory.length === 0 ? (
          <Text style={u.muted}>Nenhuma necessidade registada nesta região.</Text>
        ) : (
          r.needs.byCategory.map((c: any) => (
            <Text key={c.category} style={u.muted}>
              • {c.label}: {c.count}
            </Text>
          ))
        )}

        <View style={u.row}>
          <Btn small label="➕ Identificar necessidade" onPress={() => navigation.navigate("NgoNeedForm")} />
          <Btn small kind="outline" label="Região no Google Maps" onPress={() => openGoogle(r.lat, r.lng)} />
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  return (
    <Page loader={loader}>
      <Title>📍 Mapa</Title>
      <Text style={u.muted}>
        Locais de intervenção, comunidades apoiadas, centros de formação e as necessidades por região. Toque num ponto ou numa região.
      </Text>

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

      <View style={u.row}>
        <Chip label="Só os meus projetos" active={scope === "mine"} onPress={() => setScope("mine")} />
        <Chip label="Incluir projetos públicos de outras organizações" active={scope === "all"} onPress={() => setScope("all")} />
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
              const urgent = metric === "needs" && r.needs.urgent > 0;
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
                    backgroundColor: urgent ? "rgba(198,40,40,0.35)" : metric === "needs" ? "rgba(239,108,0,0.35)" : "rgba(0,131,143,0.35)",
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
                backgroundColor: layerColor(p.layer),
                borderWidth: 2,
                borderColor: active ? "#263238" : "#FFFFFF",
                opacity: p.approximate ? 0.85 : 1,
              }}
            />
          );
        })}
      </View>

      <View style={[u.row, { marginTop: 6 }]}>
        {LAYERS.map((l) => (
          <View key={l.key} style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color, marginRight: 4 }} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{l.label.slice(3)}</Text>
          </View>
        ))}
      </View>
      <Text style={[u.muted, { marginTop: 4 }]}>
        Mapa esquemático das regiões. Pontos sem coordenadas ficam no centro da região. Para o mapa real, use "Abrir no Google Maps".
      </Text>

      {selectedPoint ? pointCard(selectedPoint) : null}
      {selectedRegion ? regionCard(selectedRegion) : null}

      {d.unplaced > 0 ? (
        <Text style={[u.muted, { marginTop: 6 }]}>
          {d.unplaced} item(ns) sem região reconhecida não aparecem no mapa. Edite-os e escolha a região.
        </Text>
      ) : null}

      <SubTitle>Necessidades por região</SubTitle>
      {activeRegions.length === 0 ? (
        <Empty text="Ainda não há dados por região. Registe comunidades, necessidades e projetos para ver o mapa." />
      ) : (
        activeRegions.map((r) => (
          <TouchableOpacity key={r.key} activeOpacity={0.85} onPress={() => setSelected({ kind: "region", id: r.key })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.name}</Text>
                {r.needs.urgent > 0 ? (
                  <Badge label={`${r.needs.urgent} urgente(s)`} color="#C62828" />
                ) : r.needs.open > 0 ? (
                  <Badge label={`${r.needs.open} necessidade(s)`} color="#EF6C00" />
                ) : null}
              </View>
              <Text style={u.muted}>
                🌾 {r.farmers} · 🎣 {r.fishers} · 🧺 {r.artisans} · 🤝 {r.cooperatives}
              </Text>
              <Text style={u.muted}>
                📋 {r.projects} projeto(s) · 🏘️ {r.communities} comunidade(s) · 👥 {r.beneficiaries} beneficiário(s)
              </Text>
              {r.needs.byCategory.length > 0 ? (
                <Text style={u.muted} numberOfLines={2}>
                  {r.needs.byCategory.map((c: any) => `${c.label} (${c.count})`).join(", ")}
                </Text>
              ) : null}
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
        <Btn small kind="outline" label="🏘️ Comunidades" onPress={() => navigation.navigate("NgoCommunities")} />
        <Btn small kind="outline" label="📊 Monitoramento" onPress={() => navigation.navigate("NgoMonitoring")} />
        <Btn small kind="outline" label="📚 Formações" onPress={() => navigation.navigate("NgoTrainings")} />
      </View>

      {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
    </Page>
  );
}
