import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { Option, labelOf } from "../../utils/ngoCatalog";
import { STAGE_COLOR, STAGE_ICON } from "../../constants/agentOps";
import { ORDER_PROBLEM_COLOR, ORDER_PROBLEM_ICON, ORDER_STAGE_LABEL } from "../../constants/backofficeOrders";
import { money, formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  problems: Option[];
  onPress: () => void;
}

// Cartão de uma encomenda nas listas da administração
export default function BoOrderCard({ item: o, problems, onPress }: Props) {
  const hasProblems = o.problems?.length > 0;
  const finished = ["CONCLUIDA", "ENTREGUE", "CANCELADA"].includes(o.stage);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: hasProblems ? "#EF6C00" : STAGE_COLOR[o.stage] ?? colors.border,
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
      }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
          {STAGE_ICON[o.stage] ?? "📦"} Encomenda {o.code}
        </Text>
        <Badge label={ORDER_STAGE_LABEL[o.stage] ?? o.stage} color={STAGE_COLOR[o.stage] ?? "#757575"} />
      </View>

      <Text style={{ fontSize: 17, fontWeight: "bold", marginTop: 4 }}>{money(o.total)}</Text>
      <Text style={u.muted} numberOfLines={1}>
        🛒 {o.buyer?.name ?? "Comprador"} → 🏪 {o.seller?.name ?? "Vendedor"}
      </Text>
      {o.itemsPreview?.length > 0 ? (
        <Text style={u.muted} numberOfLines={1}>
          📦 {o.itemsPreview.join(", ")}
          {o.itemsCount > o.itemsPreview.length ? ` e mais ${o.itemsCount - o.itemsPreview.length}` : ""}
        </Text>
      ) : null}
      <Text style={u.muted}>
        Feita em {formatDate(o.createdAt)}
        {!finished && o.idleDays >= 1 ? ` · sem andamento há ${o.idleDays} dia(s)` : ""}
      </Text>

      {hasProblems ? (
        <View style={[u.row, { marginTop: 6 }]}>
          {o.problems.map((p: string, i: number) => (
            <View key={p} style={{ marginLeft: i === 0 ? 0 : 6 }}>
              <Badge label={`${ORDER_PROBLEM_ICON[p] ?? "⚠️"} ${labelOf(problems, p) || p}`} color={ORDER_PROBLEM_COLOR[p] ?? "#EF6C00"} />
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
