import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { NgoCatalog } from "../../utils/ngoCatalog";
import { labelOf } from "../../utils/ngoCatalog";
import { STAGE_COLOR, STAGE_ICON, humanize, shortId } from "../../constants/agentOps";
import { money, formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  stages: { value: string; label: string }[];
  onPress: () => void;
}

export default function OrderCard({ item: o, stages, onPress }: Props) {
  const star = (p: any) => (p?.isClient ? " ⭐" : "");

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: o.attention ? 5 : 1,
        borderLeftColor: o.attention ? "#EF6C00" : colors.border,
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
      }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
          {STAGE_ICON[o.stage] ?? "📦"} Encomenda {shortId(o.id)}
        </Text>
        <Badge label={labelOf(stages, o.stage) || o.stage} color={STAGE_COLOR[o.stage] ?? "#757575"} />
      </View>

      <Text style={{ fontWeight: "bold", marginTop: 4 }}>{money(o.total)}</Text>
      <Text style={u.muted}>
        🛒 {o.buyer?.name ?? "Comprador"}
        {star(o.buyer)} → 🏪 {o.seller?.name ?? "Vendedor"}
        {star(o.seller)}
      </Text>
      {o.itemsPreview?.length > 0 ? (
        <Text style={u.muted} numberOfLines={1}>
          📦 {o.itemsPreview.join(", ")}
          {o.itemsCount > o.itemsPreview.length ? ` e mais ${o.itemsCount - o.itemsPreview.length}` : ""}
        </Text>
      ) : null}
      <Text style={u.muted}>Feita em {formatDate(o.createdAt)}</Text>

      {o.delivery ? <Text style={u.muted}>🚚 Entrega: {humanize(o.delivery.status)}</Text> : null}
      {o.attention ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>⚠️ {o.attention}</Text> : null}
    </TouchableOpacity>
  );
}
