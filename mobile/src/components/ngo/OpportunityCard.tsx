import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { NgoCatalog, labelOf } from "../../utils/ngoCatalog";
import { APPLICATION_STATUS_COLOR, colorOf } from "../../constants/ngo";
import { OPPORTUNITY_ICON, amountText, deadlineInfo } from "../../constants/ngoContent";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  catalog: NgoCatalog;
  onPress: () => void;
}

export default function OpportunityCard({ item: o, catalog, onPress }: Props) {
  const deadline = deadlineInfo(o);
  const amount = amountText(o.amount, o.kind);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12 }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>
          {OPPORTUNITY_ICON[o.kind] ?? "📢"} {o.title}
        </Text>
        <Badge label={deadline.label} color={deadline.color} />
      </View>

      <Text style={u.muted}>{labelOf(catalog.opportunityKinds, o.kind)}</Text>

      <View style={[u.row, { marginTop: 4, alignItems: "center" }]}>
        {o.organization?.logoUrl ? (
          <Image source={{ uri: o.organization.logoUrl }} style={{ width: 22, height: 22, borderRadius: 11, marginRight: 6 }} />
        ) : null}
        <Text style={u.muted}>
          {o.organization?.name ?? "Organização"} {o.organization?.isVerified ? "✅" : ""}
        </Text>
      </View>

      {o.region ? <Text style={u.muted}>📍 {o.region}</Text> : null}
      {o.area ? <Text style={u.muted}>🏷️ {labelOf(catalog.areas, o.area)}</Text> : null}
      {amount ? <Text style={[u.strong, { marginTop: 4 }]}>💰 {amount}</Text> : null}
      {o.slots ? <Text style={u.muted}>👥 {o.slots} vaga(s)</Text> : null}

      {o.isMine ? (
        <Text style={{ marginTop: 6, color: colors.primary, fontWeight: "bold" }}>
          Sua · {o.applicationsCount ?? 0} candidatura(s)
          {(o.pendingCount ?? 0) > 0 ? ` (${o.pendingCount} por analisar)` : ""}
        </Text>
      ) : null}

      {o.applied ? (
        <View style={[u.row, { marginTop: 6 }]}>
          <Badge
            label={`Candidatura: ${labelOf(catalog.applicationStatus, o.myStatus)}`}
            color={colorOf(APPLICATION_STATUS_COLOR, o.myStatus)}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
