import React, { useState } from "react";
import { View, Text, Share, Alert, Switch, Platform } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getNgoReport, listNgoProjects } from "../api/ngo";
import { formatNumber } from "../utils/format";
import { isDateText, pad, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const EMPTY = { report: null as any, projects: [] as any[] };
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Relatório de impacto em texto, pronto para partilhar com financiadores, parceiros e autoridades
export default function NgoReportScreen({ navigation, route }: any) {
  const [projectId, setProjectId] = useState<string>(route?.params?.projectId ?? "");
  const [fromText, setFromText] = useState<string>(route?.params?.from ?? "");
  const [toText, setToText] = useState<string>(route?.params?.to ?? "");
  const [range, setRange] = useState({ from: route?.params?.from ?? "", to: route?.params?.to ?? "" });
  const [includeFinance, setIncludeFinance] = useState(false);

  const loader = useLoader(
    async () => {
      const [report, projects] = await Promise.all([
        getNgoReport({ projectId, from: range.from, to: range.to, includeFinance }),
        listNgoProjects(),
      ]);
      return { report, projects: (projects as any).projects };
    },
    EMPTY,
    [projectId, range, includeFinance]
  );

  const r: any = loader.data.report;
  const projects: any[] = loader.data.projects;

  function setQuick(from: string, to: string) {
    setFromText(from);
    setToText(to);
    setRange({ from, to });
  }

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
      await Share.share({ message: r.text, title: "Relatório de impacto" });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar o relatório."));
    }
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const yearStart = `${now.getFullYear()}-01-01`;
  const totals = r?.monitoring?.totals;

  return (
    <Page loader={loader}>
      <Title>📑 Relatório de impacto</Title>
      <Text style={u.muted}>Escolha o projeto e o período. O relatório fica em texto, pronto para enviar por mensagem ou por e-mail.</Text>

      {projects.length > 0 ? (
        <View style={[u.row, { marginTop: 4 }]}>
          <Chip label="Todos os projetos" active={projectId === ""} onPress={() => setProjectId("")} />
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
          ))}
        </View>
      ) : null}

      <View style={u.row}>
        <Chip label="Tudo" active={!range.from && !range.to} onPress={() => setQuick("", "")} />
        <Chip label="Este mês" active={range.from === monthStart && !range.to} onPress={() => setQuick(monthStart, "")} />
        <Chip label="Últimos 3 meses" active={range.from === todayText(-90) && !range.to} onPress={() => setQuick(todayText(-90), "")} />
        <Chip label="Este ano" active={range.from === yearStart && !range.to} onPress={() => setQuick(yearStart, "")} />
      </View>
      <View style={u.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-01-01" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-12-31" />
        </View>
      </View>
      <Btn small kind="outline" label="Aplicar datas" onPress={applyRange} />

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>Incluir as finanças</Text>
            <Text style={u.muted}>Junta o total recebido, gasto e o saldo. Desligue se vai partilhar com pessoas de fora.</Text>
          </View>
          <Switch value={includeFinance} onValueChange={setIncludeFinance} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      {!r ? (
        <Empty text="A carregar..." />
      ) : (
        <>
          <View style={u.grid}>
            {(
              [
                ["👥 Beneficiários", totals.beneficiaries],
                ["🏘️ Comunidades", totals.communitiesReached],
                ["🎓 Pessoas formadas", totals.peopleTrained],
                ["✅ Necessidades atendidas", r.needs.served],
                ["📍 Necessidades em aberto", r.needs.open],
              ] as [string, number][]
            ).map(([label, value]) => (
              <View key={label} style={u.tile}>
                <View style={u.tileBox}>
                  <Text style={u.tileValue}>{formatNumber(value)}</Text>
                  <Text style={u.tileLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Btn label="📤 Partilhar relatório" onPress={share} />

          <SubTitle>Pré-visualização</SubTitle>
          <Card>
            <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18 }}>
              {r.text}
            </Text>
          </Card>

          <Text style={[u.muted, { marginTop: 8 }]}>
            O relatório só tem números somados. Não inclui nomes nem telefones de beneficiários.
          </Text>

          <View style={u.row}>
            <Btn small kind="outline" label="📊 Ver monitoramento" onPress={() => navigation.navigate("NgoMonitoring", { projectId: projectId || undefined })} />
            <Btn small kind="outline" label="📰 Publicar os resultados" onPress={() => navigation.navigate("NgoPublicationForm", { projectId: projectId || undefined })} />
          </View>
        </>
      )}
    </Page>
  );
}
