import React from "react";
import { View } from "react-native";
import { colors } from "../theme/colors";

export default function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: "#E0E0E0", overflow: "hidden", marginTop: 6 }}>
      <View style={{ width: `${p}%` as any, height: 8, backgroundColor: color ?? colors.primary }} />
    </View>
  );
}
