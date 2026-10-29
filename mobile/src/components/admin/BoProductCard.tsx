import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import { Option, labelOf } from "../../utils/ngoCatalog";
import { DEPARTMENT_ICON, MODERATION_STATUS_COLOR, MODERATION_STATUS_LABEL, QUALITY_ICON, priceText } from "../../constants/backofficeMarket";
import { formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  item: any;
  qualityFlags: Option[];
  onPress: () => void;
  selected?: boolean;
  onToggle?: () => void;
}

// Cartão de um produto nas listas da administração
export default function BoProductCard({ item: p, qualityFlags, onPress, selected, onToggle }: Props) {
  const mod = p.moderation;
  const hiddenByTeam = mod && (mod.status === "REJEITADO" || mod.status === "REMOVIDO");

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? "rgba(46,125,50,0.06)" : "transparent",
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        flexDirection: "row",
        opacity: p.isAvailable ? 1 : 0.8,
      }}
    >
      {p.image ? (
        <Image source={{ uri: p.image }} style={{ width: 76, height: 76, borderRadius: 8, marginRight: 10 }} />
      ) : (
        <View style={{ width: 76, height: 76, borderRadius: 8, marginRight: 10, backgroundColor: "#ECEFF1", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 28 }}>{DEPARTMENT_ICON[p.department ?? "OUTRO"] ?? "📦"}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 6 }]} numberOfLines={2}>
            {p.title}
          </Text>
          {onToggle ? (
            <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 20 }}>{selected ? "✅" : "⬜"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={{ fontWeight: "bold", color: colors.primary, marginTop: 2 }}>{priceText(p.price, p.unit)}</Text>
        <Text style={u.muted} numberOfLines={1}>
          {p.owner ? `${p.owner.name}${p.owner.isVerified ? " ✅" : ""}` : "Vendedor"}
          {p.owner?.location ? ` · 📍 ${p.owner.location}` : ""}
        </Text>
        <Text style={u.muted}>
          Publicado em {formatDate(p.createdAt)}
          {p.stock !== null && p.stock !== undefined ? ` · stock ${p.stock}` : ""}
        </Text>

        <View style={[u.row, { marginTop: 4 }]}>
          {!p.isAvailable ? <Badge label={hiddenByTeam ? "Escondido pela equipa" : "Escondido"} color="#757575" /> : null}
          {p.conflict ? (
            <View style={{ marginLeft: 6 }}>
              <Badge label="Visível apesar da decisão" color="#C62828" />
            </View>
          ) : null}
          {mod ? (
            <View style={{ marginLeft: 6 }}>
              <Badge label={MODERATION_STATUS_LABEL[mod.status] ?? mod.status} color={MODERATION_STATUS_COLOR[mod.status] ?? "#757575"} />
            </View>
          ) : p.toReview ? (
            <View style={{ marginLeft: 6 }}>
              <Badge label="Novo, por rever" color="#1565C0" />
            </View>
          ) : null}
          {p.reports > 0 ? (
            <View style={{ marginLeft: 6 }}>
              <Badge label={`🚩 ${p.reports}`} color="#C62828" />
            </View>
          ) : null}
          {p.featured ? (
            <View style={{ marginLeft: 6 }}>
              <Badge label="⭐ Destaque" color="#F9A825" />
            </View>
          ) : null}
        </View>

        {p.quality?.length > 0 ? (
          <Text style={{ color: "#EF6C00", marginTop: 4, fontSize: 12 }} numberOfLines={2}>
            {p.quality.map((f: string) => `${QUALITY_ICON[f] ?? "•"} ${labelOf(qualityFlags, f) || f}`).join(" · ")}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
