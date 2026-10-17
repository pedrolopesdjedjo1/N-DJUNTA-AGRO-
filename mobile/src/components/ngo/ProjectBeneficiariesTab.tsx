import React, { useCallback } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card, Badge, Btn, Empty, useLoader, u } from "../ui";
import ProgressBar from "../ProgressBar";
import { listBeneficiaries } from "../../api/ngo";
import { useNgoCatalog, labelOf } from "../../utils/ngoCatalog";
import { colors } from "../../theme/colors";

interface Props {
  projectId: string;
  target?: number | null;
  navigation: any;
}

const EMPTY = { total: 0, women: 0, youth: 0, items: [] as any[] };

export default function ProjectBeneficiariesTab({ projectId, target, navigation }: Props) {
  const catalog = useNgoCatalog();
  const loader = useLoader(
    async () => {
      const [all, women, youth] = await Promise.all([
        listBeneficiaries({ projectId, limit: 10 }),
        listBeneficiaries({ projectId, gender: "F", limit: 1 }),
        listBeneficiaries({ projectId, youth: true, limit: 1 }),
      ]);
      return { total: all.total, women: women.total, youth: youth.total, items: all.items };
    },
    EMPTY,
    [projectId]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId])
  );

  const percent = target && target > 0 ? Math.min(100, Math.round((d.total / target) * 100)) : null;

  return (
    <View>
      <Card>
        <View style={u.grid}>
          {(
            [
              ["👥 Beneficiários", d.total],
              ["👩 Mulheres", d.women],
              ["🧑 Jovens", d.youth],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {percent !== null ? (
          <View style={{ marginTop: 8 }}>
            <Text style={u.muted}>
              Meta: {d.total} de {target} ({percent}%)
            </Text>
            <ProgressBar percent={percent} color={colors.primary} />
          </View>
        ) : null}
      </Card>

      <Btn label="➕ Registar beneficiário" onPress={() => navigation.navigate("NgoBeneficiaryForm", { projectId })} />
      <View style={u.row}>
        <Btn small kind="outline" label="🔎 Procurar pessoas no app" onPress={() => navigation.navigate("NgoDiscover", { projectId })} />
        <Btn small kind="outline" label="📋 Ver todos" onPress={() => navigation.navigate("NgoBeneficiaries", { projectId })} />
      </View>

      {d.items.length === 0 ? (
        <Empty text="Ainda não registou beneficiários deste projeto." />
      ) : (
        d.items.map((b: any) => (
          <Card key={b.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{b.name}</Text>
              {b.userId ? <Badge label="Tem conta ✅" color="#2E7D32" /> : null}
            </View>
            <Text style={u.muted}>
              {labelOf(catalog.sectors, b.sector)}
              {b.gender ? ` · ${labelOf(catalog.genders, b.gender)}` : ""}
              {b.isYouth ? " · Jovem" : ""}
            </Text>
            {b.communityName ? <Text style={u.muted}>🏘️ {b.communityName}</Text> : b.region ? <Text style={u.muted}>📍 {b.region}</Text> : null}
            {b.supportGiven ? <Text style={u.muted}>Apoio: {b.supportGiven}</Text> : null}
          </Card>
        ))
      )}

      {d.total > d.items.length ? (
        <Btn kind="outline" label={`Ver os ${d.total} beneficiários`} onPress={() => navigation.navigate("NgoBeneficiaries", { projectId })} />
      ) : null}
    </View>
  );
}
