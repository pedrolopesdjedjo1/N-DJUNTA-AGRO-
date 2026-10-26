import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { PHASE_COLOR, PHASE_ICON, kmText, minutesSince, placeLabel, weightText } from "../../constants/transporter";
import { minutesText } from "../../constants/agentOps";
import { money, formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  phases: { value: string; label: string }[];
  onPress: () => void;
}

export default function DeliveryCard({ item: c, phases, onPress }: Props) {
  const phaseLabel = phases.find((p) => p.value === c.phase)?.label ?? c.phase;
  const km = kmText(c.distanceKm, c.distanceApprox);
  const weight = weightText(c.weightKg, c.weightPartial);
  const minutes = c.phase === "EM_TRANSPORTE" ? minutesSince(c.lastLocationAt) : null;
  const warn = c.overCapacity || (c.phase === "DISPONIVEL" && !c.matchesMyRegions);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: PHASE_COLOR[c.phase] ?? colors.border,
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
      }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
          {PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
        </Text>
        <Badge label={phaseLabel} color={PHASE_COLOR[c.phase] ?? "#757575"} />
      </View>

      <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary, marginTop: 4 }}>
        {c.payout ? `💰 ${money(c.payout)}` : "💰 Valor a combinar"}
      </Text>

      <Text style={{ marginTop: 6 }}>📍 {placeLabel(c.pickup, "Recolha por confirmar")}</Text>
      <Text>🏁 {placeLabel(c.destination, "Destino por confirmar")}</Text>
      {km ? <Text style={u.muted}>📏 {km}</Text> : null}

      {c.items?.length > 0 ? (
        <Text style={[u.muted, { marginTop: 4 }]} numberOfLines={2}>
          📦 {c.items.slice(0, 3).map((i: any) => `${i.quantity}${i.unit ? ` ${i.unit}` : "×"} ${i.title}`).join(", ")}
          {c.itemsCount > 3 ? ` e mais ${c.itemsCount - 3}` : ""}
        </Text>
      ) : null}
      {weight ? <Text style={u.muted}>⚖️ {weight}</Text> : null}
      {c.desiredDate ? <Text style={u.muted}>🗓️ Data pretendida: {formatDate(c.desiredDate)}</Text> : null}
      {c.phase === "ENTREGUE" && c.deliveredAt ? <Text style={{ color: "#2E7D32", marginTop: 2 }}>Entregue em {formatDate(c.deliveredAt)}</Text> : null}
      {c.phase === "EM_TRANSPORTE" ? (
        <Text style={{ color: minutes === null || minutes > 30 ? "#EF6C00" : "#2E7D32", marginTop: 2 }}>
          📡 Localização: {minutes === null ? "ainda não partilhada" : minutesText(minutes)}
        </Text>
      ) : null}

      {warn || c.ready ? (
        <View style={[u.row, { marginTop: 6 }]}>
          {c.ready ? <Badge label="Produtos prontos" color="#2E7D32" /> : null}
          {c.overCapacity ? (
            <View style={{ marginLeft: c.ready ? 8 : 0 }}>
              <Badge label="Acima da sua capacidade" color="#C62828" />
            </View>
          ) : null}
          {c.phase === "DISPONIVEL" && !c.matchesMyRegions ? (
            <View style={{ marginLeft: c.ready || c.overCapacity ? 8 : 0 }}>
              <Badge label="Fora das suas regiões" color="#757575" />
            </View>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
