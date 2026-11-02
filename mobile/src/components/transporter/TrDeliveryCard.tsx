import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { TrCatalog } from "../../utils/transportCatalogV2";
import { labelOf } from "../../utils/ngoCatalog";
import { TR_CARGO_ICON, TR_PHASE_COLOR, TR_PHASE_ICON, trEtaText, trKmText, trPlaceLabel, trWeightText } from "../../constants/transporterV2";
import { minutesText } from "../../constants/agentOps";
import { money, formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  catalog: TrCatalog;
  onPress: () => void;
  children?: React.ReactNode;
}

// Cartão de uma entrega nas listas do Transportador
export default function TrDeliveryCard({ item: c, catalog, onPress, children }: Props) {
  const km = trKmText(c.distanceKm, c.distanceApprox);
  const eta = trEtaText(c.etaMinutes);
  const weight = trWeightText(c.weightKg, c.weightPartial);
  const incompatible = c.compatibility && !c.compatibility.ok;
  const minutes = c.phase === "EM_TRANSPORTE" && c.lastLocationAt ? Math.floor((Date.now() - new Date(c.lastLocationAt).getTime()) / 60000) : null;
  const noLocation = c.phase === "EM_TRANSPORTE" && (minutes === null || minutes > 30);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: incompatible ? "#BDBDBD" : TR_PHASE_COLOR[c.phase] ?? colors.border,
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
        opacity: incompatible && c.phase === "DISPONIVEL" ? 0.85 : 1,
      }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
          {TR_PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
        </Text>
        <Badge label={labelOf(catalog.deliveryPhases, c.phase) || c.phase} color={TR_PHASE_COLOR[c.phase] ?? "#757575"} />
      </View>

      <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary, marginTop: 4 }}>{c.payout ? `💰 ${money(c.payout)}` : "💰 Valor a combinar"}</Text>

      <Text style={{ marginTop: 4 }} numberOfLines={1}>
        📍 {trPlaceLabel(c.pickup, "Recolha por confirmar")}
      </Text>
      <Text numberOfLines={1}>🏁 {trPlaceLabel(c.destination, "Destino por confirmar")}</Text>

      <Text style={[u.muted, { marginTop: 2 }]}>
        {[km ? `📏 ${km}` : "", eta ? `⏱️ ${eta}` : "", weight ? `⚖️ ${weight}` : ""].filter(Boolean).join(" · ")}
      </Text>
      {c.fromMeKm !== null && c.fromMeKm !== undefined ? (
        <Text style={u.muted}>
          🧭 A {String(c.fromMeKm).replace(".", ",")} km de si{c.fromMeApprox ? " (aproximado)" : ""}
        </Text>
      ) : null}

      {c.items?.length > 0 ? (
        <Text style={[u.muted, { marginTop: 2 }]} numberOfLines={1}>
          {(c.cargoTypes as string[]).map((t) => TR_CARGO_ICON[t] ?? "📦").join(" ")} {c.items.map((i: any) => i.title).join(", ")}
        </Text>
      ) : null}

      <Text style={u.muted} numberOfLines={1}>
        {c.phase === "DISPONIVEL" ? `🏪 ${c.seller?.name ?? "Vendedor"} → 🛒 ${c.buyer?.name ?? "Comprador"}` : `🏪 ${c.seller?.name ?? "—"} · 🛒 ${c.buyer?.name ?? "—"}`}
      </Text>

      {c.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(c.desiredDate)}</Text> : null}
      {c.phase === "ENTREGUE" && c.deliveredAt ? <Text style={{ color: "#2E7D32", marginTop: 2 }}>Entregue em {formatDate(c.deliveredAt)}</Text> : null}
      {noLocation ? <Text style={{ color: "#EF6C00", marginTop: 2 }}>📡 Sem localização {minutes === null ? "partilhada" : minutesText(minutes)}</Text> : null}

      <View style={[u.row, { marginTop: 6 }]}>
        {c.phase === "ACEITE" && c.ready ? <Badge label="Produtos prontos para recolher" color="#2E7D32" /> : null}
        {c.phase === "DISPONIVEL" && c.matchesMyRegions === false ? <Badge label="Fora das suas regiões" color="#757575" /> : null}
        {c.phase === "DISPONIVEL" && c.overCapacity ? <Badge label="Carga acima da sua capacidade" color="#C62828" /> : null}
      </View>

      {incompatible && c.phase === "DISPONIVEL" ? (
        <Text style={{ color: "#C62828", marginTop: 4 }}>⛔ {catalog.compatMessages[c.compatibility.reasons[0]] ?? "Não serve ao seu veículo."}</Text>
      ) : null}

      {children}
    </TouchableOpacity>
  );
}
