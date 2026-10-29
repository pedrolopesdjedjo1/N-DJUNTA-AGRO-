import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { BO_ROLE_ICON, SANCTION_COLOR } from "../../constants/backoffice";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  onPress: () => void;
  extra?: React.ReactNode;
}

// Cartão de uma pessoa nas listas da administração
export default function UserRow({ item: p, onPress, extra }: Props) {
  const role = String(p.role ?? "");
  const inactive = p.isActive === false;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 10, opacity: inactive ? 0.85 : 1 }}
    >
      <View style={[u.row, { alignItems: "center" }]}>
        {p.photoUrl ? (
          <Image source={{ uri: p.photoUrl }} style={[u.photo, { width: 44, height: 44, borderRadius: 22 }]} />
        ) : (
          <View style={[u.photo, { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 20 }}>{BO_ROLE_ICON[role] ?? "👤"}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={u.strong} numberOfLines={1}>
            {p.name} {p.isVerified ? "✅" : ""}
          </Text>
          <Text style={u.muted}>{p.roleName ?? role}</Text>
        </View>
        {p.sanction ? (
          <Badge label={p.sanction.kind === "BLOQUEIO" ? "Bloqueada" : "Suspensa"} color={SANCTION_COLOR[p.sanction.kind] ?? "#C62828"} />
        ) : inactive ? (
          <Badge label="Inativa" color="#757575" />
        ) : null}
      </View>

      {p.location ? <Text style={[u.muted, { marginTop: 4 }]}>📍 {p.location}</Text> : null}
      {p.phone ? <Text style={u.muted}>📞 {p.phone}</Text> : null}
      {extra}
    </TouchableOpacity>
  );
}
