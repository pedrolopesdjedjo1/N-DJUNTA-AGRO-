import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { DEPARTMENT_LABEL } from "../../constants/agentOps";
import { money } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  onPress: () => void;
}

export function priceText(p: any): string {
  if (p.price === null || p.price === undefined) return "Preço a combinar";
  return `${money(p.price)}${p.unit ? ` / ${p.unit}` : ""}`;
}

export default function ProductCard({ item: p, onPress }: Props) {
  const image = p.images?.[0];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginTop: 10, opacity: p.isAvailable ? 1 : 0.7 }}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: 76, height: 76, borderRadius: 8, marginRight: 10 }} />
      ) : (
        <View style={{ width: 76, height: 76, borderRadius: 8, marginRight: 10, backgroundColor: "#ECEFF1", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 28 }}>{(DEPARTMENT_LABEL[p.department ?? "OUTRO"] ?? "📦").slice(0, 2)}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={u.strong} numberOfLines={2}>
          {p.title}
        </Text>
        <Text style={{ fontWeight: "bold", color: colors.primary, marginTop: 2 }}>{priceText(p)}</Text>
        {p.stock !== null && p.stock !== undefined ? <Text style={u.muted}>Disponível: {p.stock}</Text> : null}
        <Text style={u.muted} numberOfLines={1}>
          {p.owner ? `${p.owner.name}${p.owner.isVerified ? " ✅" : ""}` : "Vendedor"}
          {p.location ? ` · 📍 ${p.location}` : p.owner?.location ? ` · 📍 ${p.owner.location}` : ""}
        </Text>
        <View style={[u.row, { marginTop: 4 }]}>
          {!p.isAvailable ? <Badge label="Indisponível" color="#757575" /> : null}
          {p.lowStock ? <Badge label="A acabar" color="#EF6C00" /> : null}
          {p.owner?.isClient ? <Badge label="⭐ Seu cliente" color="#00838F" /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
