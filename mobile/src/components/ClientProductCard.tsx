import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const ICONS: Record<string, string> = {
  AGRICULTURA: "🌱",
  PESCA: "🐟",
  ARTESANATO: "🧺",
  ALIMENTACAO: "🌾",
};

interface Props {
  product: any;
  onPress: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  width?: number;
}

export default function ClientProductCard({ product: p, onPress, favorite, onToggleFavorite, width }: Props) {
  const hasRating = p.rating && p.rating.count > 0;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.card, width ? { width } : null]}>
      <View>
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={s.image} />
        ) : (
          <View style={[s.image, s.placeholder]}>
            <Text style={{ fontSize: 30 }}>{ICONS[p.department] ?? "📦"}</Text>
          </View>
        )}

        {p.discountPercent > 0 ? (
          <View style={s.discount}>
            <Text style={s.discountText}>-{p.discountPercent}%</Text>
          </View>
        ) : null}

        {onToggleFavorite ? (
          <TouchableOpacity style={s.heart} onPress={onToggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16 }}>{favorite ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>
          {p.title}
        </Text>

        <View style={s.priceRow}>
          <Text style={s.price}>{money(p.finalPrice)}</Text>
          {p.discountPercent > 0 ? <Text style={s.oldPrice}>{money(p.price)}</Text> : null}
        </View>
        <Text style={s.muted}>por {p.unit}</Text>

        {hasRating ? (
          <Text style={s.muted}>
            ★ {Number(p.rating.average).toFixed(1)} ({p.rating.count})
          </Text>
        ) : null}
        {p.location ? (
          <Text style={s.muted} numberOfLines={1}>
            📍 {p.location}
          </Text>
        ) : null}
        {p.owner ? (
          <Text style={s.muted} numberOfLines={1}>
            {p.owner.name} {p.owner.isVerified ? "✅" : ""}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.background,
    marginBottom: 10,
  },
  image: { width: "100%", height: 110 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#EEEEEE" },
  discount: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#C62828",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  heart: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 8 },
  title: { fontWeight: "bold", fontSize: 13 },
  priceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 4 },
  price: { fontWeight: "bold", color: colors.primary, fontSize: 14, marginRight: 6 },
  oldPrice: { fontSize: 11, color: colors.textSecondary, textDecorationLine: "line-through" },
  muted: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
});
