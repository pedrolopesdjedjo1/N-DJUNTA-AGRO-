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

// Cartão de uma entrega nas listas da administração
export default function BoDeliveryCard({ item: c, phases, onPress }: Props) {
  const phaseLabel = phases.find((p) => p.value === c.phase)?.label ?? c.phase;
  const km = kmText(c.distanceKm, c.distanceApprox);
  const weight = weightText(c.weightKg, c.weightPartial);
  const ageHours = c.createdAt ? (Date.now() - new Date(c.createdAt).getTime()) / 3600000 : 0;
  const minutes = c.phase === "EM_TRANSPORTE" ? minutesSince(c.lastLocationAt) : null;
  const staleLocation = c.phase === "EM_TRANSPORTE" && (minutes === null || minutes > 60);
  const waiting = c.phase === "DISPONIVEL" && ageHours > 24;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: staleLocation || waiting ? "#EF6C00" : PHASE_COLOR[c.phase] ?? colors.border,
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
      }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
          {PHASE_ICON[c.phase] ?? "📦"} Entrega {c.orderCode}
        </Text>
        <Badge label={phaseLabel} color={PHASE_COLOR[c.phase] ?? "#757575"} />
      </View>

      <Text style={{ fontWeight: "bold", color: colors.primary, marginTop: 4 }}>{c.payout ? `💰 ${money(c.payout)}` : "💰 Valor a combinar"}</Text>
      <Text style={{ marginTop: 4 }} numberOfLines={1}>
        📍 {placeLabel(c.pickup, "Recolha")}
      </Text>
      <Text numberOfLines={1}>🏁 {placeLabel(c.destination, "Destino")}</Text>
      <Text style={u.muted}>{[km ? `📏 ${km}` : "", weight ? `⚖️ ${weight}` : ""].filter(Boolean).join(" · ")}</Text>

      <Text style={[u.muted, { marginTop: 2 }]} numberOfLines={1}>
        🚛 {c.transporter ? c.transporter.name : "Sem transportador"} · 🛒 {c.buyer?.name ?? "—"} ← 🏪 {c.seller?.name ?? "—"}
      </Text>

      {c.phase === "ENTREGUE" && c.deliveredAt ? <Text style={{ color: "#2E7D32", marginTop: 2 }}>Entregue em {formatDate(c.deliveredAt)}</Text> : null}
      {staleLocation ? (
        <Text style={{ color: "#EF6C00", marginTop: 2 }}>📡 Sem localização {minutes === null ? "partilhada" : minutesText(minutes)}</Text>
      ) : null}
      {waiting ? <Text style={{ color: "#EF6C00", marginTop: 2 }}>⏳ Ninguém aceitou há {Math.floor(ageHours / 24)} dia(s)</Text> : null}
      {c.overCapacity ? (
        <View style={[u.row, { marginTop: 4 }]}>
          <Badge label="Carga acima da capacidade do veículo" color="#C62828" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
