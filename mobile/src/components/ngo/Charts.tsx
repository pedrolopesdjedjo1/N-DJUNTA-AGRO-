import React from "react";
import { View, Text } from "react-native";
import ProgressBar from "../ProgressBar";
import { u } from "../ui";
import { formatNumber } from "../../utils/format";
import { colors } from "../../theme/colors";

interface Datum {
  label: string;
  value: number;
}

// Barras horizontais com nome e valor (ex: beneficiários por região)
export function HBars({ data, color }: { data: Datum[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View>
      {data.map((d) => (
        <View key={d.label} style={{ marginTop: 8 }}>
          <View style={u.between}>
            <Text style={{ flex: 1, marginRight: 8 }}>{d.label}</Text>
            <Text style={{ fontWeight: "bold" }}>{formatNumber(d.value)}</Text>
          </View>
          <ProgressBar percent={(d.value / max) * 100} color={color} />
        </View>
      ))}
    </View>
  );
}

// Colunas lado a lado (ex: beneficiários acumulados em 12 meses)
export function ColumnBars({ data, color, height = 110 }: { data: Datum[]; color?: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: height + 34, marginTop: 8 }}>
      {data.map((d) => (
        <View key={d.label} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <Text style={{ fontSize: 9, color: colors.textSecondary }}>{d.value > 0 ? formatNumber(d.value) : ""}</Text>
          <View
            style={{
              width: 12,
              height: d.value > 0 ? Math.max(3, (d.value / max) * height) : 2,
              backgroundColor: d.value > 0 ? color ?? colors.primary : "#BDBDBD",
              borderRadius: 3,
              marginTop: 2,
            }}
          />
          <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 4 }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}
