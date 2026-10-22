import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { ALERT_KIND_ICON, ALERT_STATE, SEVERITY_COLOR } from "../../constants/gov";
import { GovCatalog } from "../../utils/govCatalog";
import { labelOf } from "../../utils/ngoCatalog";
import { colors } from "../../theme/colors";

interface Props {
  alert: any;
  catalog: GovCatalog;
  onPress?: () => void;
  showState?: boolean;
}

export default function AlertCard({ alert: a, catalog, onPress, showState }: Props) {
  const color = SEVERITY_COLOR[a.severity] ?? "#757575";
  const state = ALERT_STATE[a.state];

  const body = (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5, borderLeftColor: color, borderRadius: 10, padding: 12, marginTop: 12 }}>
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
          {ALERT_KIND_ICON[a.kind] ?? "📢"} {a.title}
        </Text>
        <Badge label={labelOf(catalog.alertSeverity, a.severity)} color={color} />
      </View>

      <Text style={u.muted}>{labelOf(catalog.alertKinds, a.kind)}</Text>
      <Text style={{ marginTop: 6, lineHeight: 20 }} numberOfLines={3}>
        {a.message}
      </Text>

      <Text style={[u.muted, { marginTop: 6 }]}>📍 {a.regionNames}</Text>
      {a.hoursLeft !== null && a.hoursLeft !== undefined && a.state === "ATIVO" ? (
        <Text style={u.muted}>
          ⏳ Termina em {a.hoursLeft >= 48 ? `${Math.ceil(a.hoursLeft / 24)} dias` : `${a.hoursLeft} hora(s)`}
        </Text>
      ) : null}
      <Text style={u.muted}>
        {a.organization?.name ?? "Instituição"} {a.organization?.isVerified ? "✅" : ""}
      </Text>

      {showState && state ? (
        <View style={[u.row, { marginTop: 6 }]}>
          <Badge label={state.label} color={state.color} />
          {a.notifiedCount ? <Text style={[u.muted, { marginLeft: 8, alignSelf: "center" }]}>🔔 {a.notifiedCount} avisado(s)</Text> : null}
        </View>
      ) : null}
    </View>
  );

  return onPress ? (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}
