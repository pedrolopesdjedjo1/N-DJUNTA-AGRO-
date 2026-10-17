import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "./ui";
import ProgressBar from "./ProgressBar";
import { NgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatDate } from "../constants/market";
import { colors } from "../theme/colors";

export default function NgoProjectCard({
  project: p,
  catalog,
  onPress,
}: {
  project: any;
  catalog: NgoCatalog;
  onPress: () => void;
}) {
  const hasTarget = !!p.targetBeneficiaries && p.targetBeneficiaries > 0;
  const percent = hasTarget ? Math.min(100, Math.round(((p.beneficiaries ?? 0) / p.targetBeneficiaries) * 100)) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden", marginTop: 12 }}
    >
      {p.coverUrl ? <Image source={{ uri: p.coverUrl }} style={{ width: "100%", height: 120 }} /> : null}

      <View style={{ padding: 12 }}>
        <View style={u.between}>
          <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>{p.name}</Text>
          <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
        </View>

        <Text style={u.muted}>
          {iconOf(catalog.areas, p.area)} {labelOf(catalog.areas, p.area)}
          {p.focus ? ` · ${labelOf(catalog.focus[p.area] ?? [], p.focus)}` : ""}
        </Text>
        {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
        {p.startDate || p.endDate ? (
          <Text style={u.muted}>
            🗓️ {p.startDate ? formatDate(p.startDate) : "—"} a {p.endDate ? formatDate(p.endDate) : "—"}
          </Text>
        ) : null}

        {p.overdue ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ Passou a data de término</Text> : null}
        {!p.overdue && p.daysLeft !== null && p.daysLeft !== undefined && p.daysLeft >= 0 && p.daysLeft <= 14 && p.status === "EM_ANDAMENTO" ? (
          <Text style={{ color: "#EF6C00", marginTop: 4 }}>⏳ Faltam {p.daysLeft} dia(s)</Text>
        ) : null}

        <Text style={[u.muted, { marginTop: 6 }]}>
          👥 {p.beneficiaries ?? 0} beneficiário(s)
          {hasTarget ? ` de ${p.targetBeneficiaries}` : ""} · 📝 {p.updatesCount ?? 0} atualização(ões)
        </Text>
        {percent !== null ? <ProgressBar percent={percent} /> : null}

        {p.progress !== null && p.progress !== undefined ? (
          <Text style={[u.muted, { marginTop: 4 }]}>Progresso da execução: {p.progress}%</Text>
        ) : null}

        {!p.isPublic ? <Text style={[u.muted, { marginTop: 4 }]}>🔒 Projeto privado</Text> : null}
      </View>
    </TouchableOpacity>
  );
}
