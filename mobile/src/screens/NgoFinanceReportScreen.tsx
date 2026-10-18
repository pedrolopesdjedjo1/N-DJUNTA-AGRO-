import React, { useState } from "react";
import { View, Text, Share, Alert } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ProgressBar from "../components/ProgressBar";
import { getFinanceReport, listNgoProjects } from "../api/ngo";
import { isDateText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";
import { colors } from "../theme/colors";

const EMPTY = {
  report: null as any,
  projects: [] as any[],
};

export default function NgoFinanceReportScreen({ route }: any) {
  const [projectId, setProjectId] = useState<string>(route?.params?.projectId ?? "");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const loader = useLoader(
    async () => {
      const [report, projects] = await Promise.all([
        getFinanceReport({ projectId, from: range.from, to: range.to }),
        listNgoProjects(),
      ]);
      return { report, projects: (projects as any).projects };
    },
    EMPTY,
    [projectId, range]
  );

  const r: any = loader.data.report;
  const projects: any[] = loader.data.projects;

  function applyRange() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-01-01).");
      return;
    }
    setRange({ from: fromText.trim(), to: toText.trim() });
  }

  async function share() {
    if (!r) return;
    try {
      await Share.share({ message: r.text });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar o relatório."));
    }
  }

  const tiles: [string, number][] = r
    ? [
        ["💰 Recebido", r.totals.received],
        ["💸 Gasto", r.totals.spent],
        ["⚖️ Saldo", r.totals.balance],
        ["✅ Aprovado, por receber", r.totals.approved],
        ["📨 Solicitado", r.totals.requested],
      ]
    : [];

  const maxCategory = r ? Math.max(1, ...r.byCategory.map((c: any) => c.amount)) : 1;

  return (
    <Page loader={loader}>
      <Title>📑 Relatório financeiro</Title>

      {projects.length > 0 ? (
        <View style={u.row}>
          <Chip label="Todos os projetos" active={projectId === ""} onPress={() => setProjectId("")} />
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
          ))}
        </View>
      ) : null}

      <View style={u.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-01-01" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-12-31" />
        </View>
      </View>
      <View style={u.row}>
        <Btn small kind="outline" label="Aplicar datas" onPress={applyRange} />
        {range.from || range.to ? (
          <Btn
            small
            kind="outline"
            label="Limpar datas"
            onPress={() => {
              setFromText("");
              setToText("");
              setRange({ from: "", to: "" });
            }}
          />
        ) : null}
      </View>

      {!r ? (
        <Empty text="A carregar..." />
      ) : (
        <>
          <View style={u.grid}>
            {tiles.map(([label, value]) => (
              <View key={label} style={u.tile}>
                <View style={u.tileBox}>
                  <Text style={[u.tileValue, { fontSize: 16, color: label.includes("Saldo") && value < 0 ? "#C62828" : undefined }]}>{money(value)}</Text>
                  <Text style={u.tileLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Btn label="📤 Partilhar relatório" onPress={share} />

          {r.byProject.length > 0 ? (
            <>
              <SubTitle>Por projeto</SubTitle>
              {r.byProject.map((p: any) => (
                <Card key={p.projectId || "none"}>
                  <Text style={u.strong}>{p.name}</Text>
                  <Text style={u.muted}>
                    💰 Recebido: {money(p.received)} · 💸 Gasto: {money(p.spent)}
                  </Text>
                  <Text style={{ marginTop: 2, color: p.balance < 0 ? "#C62828" : colors.primary, fontWeight: "bold" }}>Saldo: {money(p.balance)}</Text>
                  {p.approved > 0 ? <Text style={u.muted}>✅ Aprovado, por receber: {money(p.approved)}</Text> : null}
                  {p.budget ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={u.muted}>
                        Orçamento: {money(p.budget)} · executado {p.executionPercent ?? 0}%
                      </Text>
                      <ProgressBar percent={p.executionPercent ?? 0} color={(p.executionPercent ?? 0) > 100 ? "#C62828" : colors.primary} />
                    </View>
                  ) : null}
                </Card>
              ))}
            </>
          ) : null}

          {r.byCategory.length > 0 ? (
            <>
              <SubTitle>Despesas por tipo</SubTitle>
              <Card>
                {r.byCategory.map((c: any) => (
                  <View key={c.category} style={{ marginTop: 6 }}>
                    <View style={u.between}>
                      <Text style={{ flex: 1, marginRight: 8 }}>{c.label}</Text>
                      <Text style={{ fontWeight: "bold" }}>{money(c.amount)}</Text>
                    </View>
                    <ProgressBar percent={(c.amount / maxCategory) * 100} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {r.byKind.length > 0 ? (
            <>
              <SubTitle>Recebido por tipo</SubTitle>
              <Card>
                {r.byKind.map((k: any) => (
                  <View key={k.kind} style={[u.between, { marginTop: 4 }]}>
                    <Text>{k.label}</Text>
                    <Text style={{ fontWeight: "bold" }}>{money(k.amount)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {r.byPartner.length > 0 ? (
            <>
              <SubTitle>Recebido por parceiro</SubTitle>
              <Card>
                {r.byPartner.map((p: any) => (
                  <View key={p.name} style={[u.between, { marginTop: 4 }]}>
                    <Text style={{ flex: 1, marginRight: 8 }}>{p.name}</Text>
                    <Text style={{ fontWeight: "bold" }}>{money(p.amount)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <Text style={[u.muted, { marginTop: 12 }]}>
            Os números vêm dos registos de financiamentos e despesas da organização. O saldo é o recebido menos o gasto no período.
          </Text>
        </>
      )}
    </Page>
  );
}
