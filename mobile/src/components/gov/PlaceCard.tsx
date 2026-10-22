import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { PLACE_KIND_ICON, PLACE_STATUS_COLOR } from "../../constants/gov";
import { GovCatalog } from "../../utils/govCatalog";
import { labelOf } from "../../utils/ngoCatalog";
import { colors } from "../../theme/colors";

interface Props {
  place: any;
  catalog: GovCatalog;
  onPress: () => void;
}

export default function PlaceCard({ place: p, catalog, onPress }: Props) {
  const color = PLACE_STATUS_COLOR[p.status] ?? "#757575";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12 }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>
          {PLACE_KIND_ICON[p.kind] ?? "📍"} {p.name}
        </Text>
        <Badge label={labelOf(catalog.placeStatus, p.status)} color={color} />
      </View>

      <Text style={u.muted}>
        {labelOf(catalog.placeKinds, p.kind)} · {labelOf(catalog.placeSubtypes[p.kind] ?? [], p.subtype)}
      </Text>
      <Text style={u.muted}>📍 {[p.address, p.region].filter(Boolean).join(", ")}</Text>
      {p.products?.length > 0 ? <Text style={u.muted}>🧺 {p.products.join(", ")}</Text> : null}
      {p.capacity ? <Text style={u.muted}>📦 {p.capacity}</Text> : null}
      {p.status === "DANIFICADA" ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ Danificada</Text> : null}
      {p.isMine && p.isPublic === false ? <Text style={[u.muted, { marginTop: 4 }]}>🔒 Privado</Text> : null}
    </TouchableOpacity>
  );
}
