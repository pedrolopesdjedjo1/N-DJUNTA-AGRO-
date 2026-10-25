import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Linking, Alert, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getAgentMap } from "../api/agent";
import { getPosition } from "../utils/location";
import { useAgentCatalog } from "../utils/agentCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ROLE_ICON, ROLE_NAME } from "../constants/agent";
import { PLACE_STATUS_COLOR, SERVICE_STATUS_COLOR } from "../constants/gov";
import { distanceKm, kmText } from "../constants/agentSupport";
import { whatsappUrl } from "../utils/links";
import { colors } from "../theme/colors";

const EMPTY = {
  bounds: { minLat: 10.85, maxLat: 12.75, minLng: -16.85, maxLng: -13.55 },
  points: [] as any[],
  unplaced: 0,
  regions: [] as any[],
  note: "",
};

const LAYERS = [
  { key: "clients", label: "👥 Os meus clientes", color: "#2E7D32" },
  { key: "markets", label: "🛒 Mercados", color: "#F9A825" },
  { key: "services", label: "🏛️ Serviços públicos", color: "#00838F" },
  { key: "cooperatives", label: "🤝 Cooperativas", color: "#6A1B9A" },
  { key: "agents", label: "🤝 Pontos de atendimento", color: "#1565C0" },
];

const METRICS: [string, string][] = [
  ["clients", "👥 Os meus clientes"],
  ["needs", "📍 As minhas necessidades"],
  ["farmers", "🌾 Agricultores"],
  ["fishers", "🎣 Pescadores"],
  ["artisans", "🧺 Artesãos"],
  ["merchants", "🏪 Comerciantes"],
  ["transporters", "🚚 Transportadores"],
  ["cooperatives", "🤝 Cooperativas"],
  ["markets", "🛒 Mercados"],
  ["services", "🏛️ Serviços"],
  ["agents", "📌 Pontos de atendimento"],
];

type Selected = { kind: "point" | "region"; id: string } | null;

function route(p: { lat: number; lng: number }) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`);
}

export default function AgentMapScreen({ navigation }: any) {
  const agentCatalog = useAgentCatalog();
  const gov = useGovCatalog();
  const { width } = useWindowDimensions();
  const W = Math.max(260, width - 32);

  const [layers, setLayers] = useState<string[]>(LAYERS.map((l) => l.key));
  const [metric, setMetric] = useState("clients");
  const [selected, setSelected] = useState<Selected>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const loader = useLoader(() => getAgentMap({}), EMPTY);
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

  const layerColor = (key: string) => LAYERS.find((l) => l.key === key)?.color ?? "#757575";

  // Pontos no mesmo sítio abrem-se em círculo para se poderem tocar
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
  const maxMetric = Math.max(1, ...regions.map((r) => Number(r[metric]) || 0));

  const selectedPoint = selected?.kind === "point" ? (d.points as any[]).find((p) => `${p.layer}:${p.id}` === selected.id) : null;
  const selectedRegion = selected?.kind === "region" ? regions.find((r) => r.key === selected.id) : null;

  const nearby = here
    ? (d.points as any[])
        .filter((p) => ["markets", "services", "agents"].includes(p.layer))
        .map((p) => ({ p, km: distanceKm(here.lat, here.lng, p.lat, p.lng) }))
        .sort((a, c) => a.km - c.km)
        .slice(0, 8)
    : [];

  function pointTitle(p: any) {
    const kind: Record<string, string> = { clients: "Cliente", markets: "Mercado", services: "Serviço público", cooperatives: "Cooperativa", agents: p.isMe ? "O meu ponto de atendimento" : "Ponto de atendimento" };
    return kind[p.layer] ?? "";
  }

  function pointCard(p: any) {
    const wa = whatsappUrl(p.phone);
    const status =
      p.layer === "markets"
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
        <Text style={u.muted}>{pointTitle(p)}</Text>

        {p.layer === "clients" ? (
          <Text style={u.muted}>
            {ROLE_ICON[p.role] ?? ""} {ROLE_NAME[p.role] ?? p.role}
            {p.isVerified ? " ✅" : ""}
          </Text>
        ) : null}
        {p.layer === "markets" ? <Text style={u.muted}>{labelOf(gov.placeSubtypes.MERCADO ?? [], p.subtype)}</Text> : null}
        {p.layer === "services" ? <Text style={u.muted}>{labelOf(gov.serviceCategories, p.category)}</Text> : null}
        {p.layer === "agents" ? (
          <>
            <Text style={u.muted}>
              {labelOf(agentCatalog.agentTypes, p.agentType)} {p.isVerified ? "✅" : ""}
            </Text>
            {p.address ? <Text style={u.muted}>🏠 {p.address}</Text> : null}
          </>
        ) : null}

        {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
        {p.schedule ? <Text style={u.muted}>🕒 {p.schedule}</Text> : null}
        {p.approximate ? <Text style={u.muted}>Posição aproximada (centro da região).</Text> : null}

        <View style={u.row}>
          <Btn small label={p.approximate ? "🧭 Rota até à região" : "🧭 Rota"} onPress={() => route(p)} />
          {p.layer === "clients" && p.linkId ? <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: p.linkId })} /> : null}
          {p.layer === "clients" ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} /> : null}
          {p.layer === "clients" && p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
          {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
          {p.layer === "markets" ? <Btn small kind="outline" label="Abrir mercado" onPress={() => navigation.navigate("GovPlace", { id: p.id })} /> : null}
          {p.layer === "services" ? <Btn small kind="outline" label="Abrir serviço" onPress={() => navigation.navigate("GovService", { id: p.id })} /> : null}
          {p.layer === "agents" && !p.isMe ? <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} /> : null}
          {p.layer === "agents" && p.isMe ? <Btn small kind="outline" label="Editar o ponto" onPress={() => navigation.navigate("AgentProfileForm")} /> : null}
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  function regionCard(r: any) {
    const rows: [string, number][] = [
      ["👥 Os meus clientes", r.clients],
      ["🌾 Agricultores no app", r.farmers],
      ["🎣 Pescadores no app", r.fishers],
      ["🧺 Artesãos no app", r.artisans],
      ["🏪 Comerciantes no app", r.merchants],
      ["🚚 Transportadores no app", r.transporters],
      ["🤝 Cooperativas", r.cooperatives],
      ["🛒 Mercados", r.markets],
      ["🏛️ Serviços públicos", r.services],
      ["📌 Pontos de atendimento", r.agents],
    ];

    return (
      <Card>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🗺️ {r.name}</Text>
          {r.mine ? <Badge label="A sua região" color="#00838F" /> : null}
        </View>
        {rows.map(([label, value]) => (
          <View key={label} style={[u.between, { marginTop: 4 }]}>
            <Text>{label}</Text>
            <Text style={{ fontWeight: "bold" }}>{value}</Text>
          </View>
        ))}
        {r.needs > 0 ? <Text style={{ color: "#EF6C00", marginTop: 6 }}>📍 {r.needs} necessidade(s) sua(s) por resolver</Text> : null}

        <View style={u.row}>
          <Btn small label="🌱 Produtores" onPress={() => navigation.navigate("AgentProducers", { region: r.key })} />
          <Btn small kind="outline" label="🤝 Cooperativas" onPress={() => navigation.navigate("AgentCooperatives", { region: r.key })} />
          <Btn small kind="outline" label="📍 Necessidades" onPress={() => navigation.navigate("AgentNeeds", { region: r.key })} />
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="🧭 Rota até à região" onPress={() => route(r)} />
          <Btn small kind="outline" label="Fechar" onPress={() => setSelected(null)} />
        </View>
      </Card>
    );
  }

  return (
    <AgentLayout active="AgentHome">
      <Page loader={loader}>
        <Title>🗺️ Mapa</Title>
        <Text style={u.muted}>
          Os seus clientes, os mercados, os serviços públicos, as cooperativas e os pontos de atendimento. Toque num ponto ou numa região.
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
                const value = Number(r[metric]) || 0;
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
                      backgroundColor: metric === "needs" ? "rgba(239,108,0,0.35)" : "rgba(0,131,143,0.35)",
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
                  borderColor: active ? "#263238" : p.isMe ? "#C62828" : "#FFFFFF",
                  opacity: p.approximate ? 0.85 : 1,
                }}
              />
            );
          })}

          {here ? (
            <View
              style={{
                position: "absolute",
                left: toXY(here.lat, here.lng).x - 7,
                top: toXY(here.lat, here.lng).y - 7,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: "#C62828",
                borderWidth: 2,
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
        </View>
        <Text style={[u.muted, { marginTop: 4 }]}>
          Mapa esquemático das regiões. Pontos sem coordenadas ficam no centro da região. Para o caminho real, toque em "Rota": abre o Google Maps.
        </Text>

        {selectedPoint ? pointCard(selectedPoint) : null}
        {selectedRegion ? regionCard(selectedRegion) : null}

        <SubTitle>Serviços e pontos perto de si</SubTitle>
        <Btn small kind="outline" label={locating ? "A procurar o sinal GPS..." : here ? "📡 Atualizar a minha posição" : "📡 Mostrar o que está perto de mim"} onPress={locate} disabled={locating} />
        {here && nearby.length === 0 ? <Empty text="Não há mercados, serviços ou pontos de atendimento registados." /> : null}
        {nearby.map(({ p, km }) => (
          <TouchableOpacity key={`${p.layer}:${p.id}`} activeOpacity={0.85} onPress={() => setSelected({ kind: "point", id: `${p.layer}:${p.id}` })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
                <Badge label={`${p.approximate ? "≈ " : ""}${kmText(km)}`} color="#00838F" />
              </View>
              <Text style={u.muted}>
                {pointTitle(p)}
                {p.region ? ` · 📍 ${p.region}` : ""}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        {d.unplaced > 0 ? <Text style={[u.muted, { marginTop: 6 }]}>{d.unplaced} item(ns) sem região reconhecida não aparecem no mapa.</Text> : null}

        <View style={u.row}>
          <Btn small kind="outline" label="👥 Clientes" onPress={() => navigation.navigate("AgentClients")} />
          <Btn small kind="outline" label="🌱 Comunidades" onPress={() => navigation.navigate("AgentCommunities")} />
          <Btn small kind="outline" label="🏛️ Serviços" onPress={() => navigation.navigate("GovServices")} />
        </View>

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
      </Page>
    </AgentLayout>
  );
}
