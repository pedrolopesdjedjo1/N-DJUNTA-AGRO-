import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Badge, u } from "../ui";
import ProgressBar from "../ProgressBar";
import { NgoCatalog, iconOf, labelOf } from "../../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../../constants/ngo";
import { formatDate } from "../../constants/market";
import { colors } from "../../theme/colors";

interface Props {
  program: any;
  catalog: NgoCatalog;
  onPress: () => void;
  showOrg?: boolean;
}

export default function GovProgramCard({ program: p, catalog, onPress, showOrg }: Props) {
  const hasTarget = !!p.targetBeneficiaries && p.targetBeneficiaries > 0;
  const percent = hasTarget ? Math.min(100, Math.round(((p.beneficiaries ?? 0) / p.targetBeneficiaries) * 100)) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12 }}
    >
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 16 }]}>{p.name}</Text>
        <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
      </View>

      <Text style={u.muted}>
        {iconOf(catalog.areas, p.area)} {labelOf(catalog.areas, p.area)}
      </Text>

      {showOrg && p.organization ? (
        <View style={[u.row, { alignItems: "center", marginTop: 4 }]}>
          {p.organization.logoUrl ? (
            <Image source={{ uri: p.organization.logoUrl }} style={{ width: 22, height: 22, borderRadius: 11, marginRight: 6 }} />
          ) : null}
          <Text style={u.muted}>
            {p.organization.name} {p.organization.isVerified ? "✅" : ""}
          </Text>
        </View>
      ) : null}

      <Text style={u.muted}>📍 {p.regions && p.regions.length > 0 ? p.regions.join(", ") : "Todo o país"}</Text>

      {p.startDate || p.endDate ? (
        <Text style={u.muted}>
          🗓️ {p.startDate ? formatDate(p.startDate) : "—"} a {p.endDate ? formatDate(p.endDate) : "—"}
        </Text>
      ) : null}

      {p.overdue ? <Text style={{ color: "#C62828", marginTop: 4 }}>⚠️ Passou a data de término</Text> : null}
      {!p.overdue && p.daysLeft !== null && p.daysLeft !== undefined && p.daysLeft >= 0 && p.daysLeft <= 30 && p.status === "EM_ANDAMENTO" ? (
        <Text style={{ color: "#EF6C00", marginTop: 4 }}>⏳ Faltam {p.daysLeft} dia(s)</Text>
      ) : null}

      <Text style={[u.muted, { marginTop: 6 }]}>
        📋 {p.projectsCount ?? 0} projeto(s) · 👥 {p.beneficiaries ?? 0} beneficiário(s)
        {hasTarget ? ` de ${p.targetBeneficiaries}` : ""}
      </Text>
      {percent !== null ? <ProgressBar percent={percent} /> : null}

      {p.isPublic === false ? <Text style={[u.muted, { marginTop: 4 }]}>🔒 Programa privado</Text> : null}
    </TouchableOpacity>
  );
}
