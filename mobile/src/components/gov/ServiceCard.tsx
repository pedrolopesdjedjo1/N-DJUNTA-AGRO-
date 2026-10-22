import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { SERVICE_ICON, SERVICE_STATUS_COLOR } from "../../constants/gov";
import { GovCatalog } from "../../utils/govCatalog";
import { labelOf } from "../../utils/ngoCatalog";
import { colors } from "../../theme/colors";

interface Props {
  service: any;
  catalog: GovCatalog;
  onPress: () => void;
}

export default function ServiceCard({ service: s, catalog, onPress }: Props) {
  const color = SERVICE_STATUS_COLOR[s.status] ?? "#757575";
  const closed = s.status === "TEMPORARIO" || s.status === "ENCERRADO";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12, opacity: s.status === "ENCERRADO" ? 0.75 : 1 }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>
          {SERVICE_ICON[s.category] ?? "🏛️"} {s.name}
        </Text>
        <Badge label={labelOf(catalog.serviceStatus, s.status)} color={color} />
      </View>

      <Text style={u.muted}>{labelOf(catalog.serviceCategories, s.category)}</Text>
      <Text style={u.muted}>
        🏢 {s.organization?.name ?? "Instituição"} {s.organization?.isVerified ? "✅" : ""}
      </Text>

      {s.region || s.address ? <Text style={u.muted}>📍 {[s.address, s.region].filter(Boolean).join(", ")}</Text> : null}
      {s.schedule ? <Text style={u.muted}>🕒 {s.schedule}</Text> : null}
      {closed && s.statusNote ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>⚠️ {s.statusNote}</Text> : null}
      {s.isMine && s.isPublished === false ? <Text style={[u.muted, { marginTop: 4 }]}>🔒 Rascunho (só a sua instituição vê)</Text> : null}
    </TouchableOpacity>
  );
}
