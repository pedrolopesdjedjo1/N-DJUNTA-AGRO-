import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { Option, labelOf } from "../../utils/ngoCatalog";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  REPORT_CATEGORY_ICON,
  REPORT_STATUS_COLOR,
  REPORT_TARGET_ICON,
} from "../../constants/backofficeModeration";
import { formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  categories: Option[];
  statuses: Option[];
  decisions: Option[];
  onPress: () => void;
}

// Cartão de uma denúncia nas listas da moderação
export default function ReportCard({ item: r, categories, statuses, decisions, onPress }: Props) {
  const decided = r.status === "RESOLVIDA" || r.status === "ARQUIVADA";
  const age = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: decided ? "#BDBDBD" : PRIORITY_COLOR[r.priority] ?? "#757575",
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
      }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
          {REPORT_CATEGORY_ICON[r.category] ?? "📝"} {labelOf(categories, r.category) || r.category}
        </Text>
        <Badge label={labelOf(statuses, r.status) || r.status} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
      </View>

      <Text style={{ marginTop: 4 }}>
        {REPORT_TARGET_ICON[r.targetType] ?? "📝"} {r.target?.label ?? "—"}
      </Text>
      {r.target?.detail ? <Text style={u.muted}>{r.target.detail}</Text> : null}

      <Text style={{ marginTop: 4, lineHeight: 19 }} numberOfLines={2}>
        {r.description}
      </Text>

      <Text style={[u.muted, { marginTop: 4 }]} numberOfLines={1}>
        De {r.reporter?.name ?? "—"}
        {r.reported ? ` → contra ${r.reported.name}` : ""}
      </Text>

      <View style={[u.row, { marginTop: 6 }]}>
        {!decided && r.priority !== "NORMAL" ? <Badge label={PRIORITY_LABEL[r.priority] ?? r.priority} color={PRIORITY_COLOR[r.priority] ?? "#757575"} /> : null}
        {r.reportsOnTarget > 1 ? (
          <View style={{ marginLeft: !decided && r.priority !== "NORMAL" ? 8 : 0 }}>
            <Badge label={`${r.reportsOnTarget} denúncias sobre o mesmo`} color="#6A1B9A" />
          </View>
        ) : null}
        {r.assignedTo ? (
          <View style={{ marginLeft: 8 }}>
            <Badge label={`🙋 ${r.assignedTo.name}`} color="#00838F" />
          </View>
        ) : null}
      </View>

      <Text style={[u.muted, { marginTop: 4 }]}>
        {decided ? `Decidida em ${formatDate(r.decidedAt)}${r.decision ? ` · ${labelOf(decisions, r.decision)}` : ""}` : `Há ${age} dia(s) · ${formatDate(r.createdAt)}`}
      </Text>
    </TouchableOpacity>
  );
}
