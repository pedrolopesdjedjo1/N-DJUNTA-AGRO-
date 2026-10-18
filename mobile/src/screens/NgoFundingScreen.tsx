import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listFunding, updateFunding, deleteFunding } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { FUNDING_STATUS_COLOR, colorOf } from "../constants/ngo";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY = {
  summary: { received: 0, approved: 0, requested: 0, prospecting: 0, byStatus: {} as Record<string, { count: number; amount: number }> },
  fundedProjects: [] as any[],
  items: [] as any[],
};

type Step = { to: string; label: string; confirm?: string; kind?: "primary" | "outline" | "danger" };

const NEXT: Record<string, Step[]> = {
  PROSPECCAO: [
    { to: "SOLICITADO", label: "📨 Já pedi" },
    { to: "ENCERRADO", label: "Encerrar", kind: "outline" },
  ],
  SOLICITADO: [
    { to: "APROVADO", label: "✅ Aprovado" },
    { to: "RECUSADO", label: "Recusado", kind: "danger", confirm: "Marcar este financiamento como recusado?" },
  ],
  APROVADO: [{ to: "RECEBIDO", label: "💰 Recebido", confirm: "Confirma que o dinheiro já foi recebido?" }],
  RECEBIDO: [{ to: "ENCERRADO", label: "Encerrar", kind: "outline" }],
  RECUSADO: [{ to: "PROSPECCAO", label: "Reabrir", kind: "outline" }],
  ENCERRADO: [],
};

const PENDING = ["PROSPECCAO", "SOLICITADO", "APROVADO"];

export default function NgoFundingScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const [projectId, setProjectId] = useState<string>(route?.params?.projectId ?? "");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const loader = useLoader(() => listFunding({ projectId, status, kind }), EMPTY, [projectId, status, kind]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const projectName = projectId ? d.items.find((f: any) => f.projectId === projectId)?.projectName ?? d.fundedProjects.find((f: any) => f.projectId === projectId)?.name : "";

  async function change(item: any, step: Step) {
    const run = async () => {
      try {
        await updateFunding(item.id, { status: step.to });
        loader.reload();
      } catch (e) {
        Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o estado."));
      }
    };

    if (step.confirm) {
      Alert.alert("Mudar o estado", step.confirm, [
        { text: "Não", style: "cancel" },
        { text: "Sim", onPress: run },
      ]);
    } else {
      run();
    }
  }

  function remove(item: any) {
    Alert.alert("Apagar financiamento", `Apagar "${item.title}"? As despesas ligadas ficam guardadas.`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFunding(item.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const tiles: [string, number][] = [
    ["💰 Recebido", d.summary.received],
    ["✅ Aprovado, por receber", d.summary.approved],
    ["📨 Solicitado", d.summary.requested],
    ["🔍 Em prospeção", d.summary.prospecting],
  ];

  return (
    <Page loader={loader}>
      <Title>💰 Financiamento</Title>
      <Text style={u.muted}>Registos de subvenções, doações e financiamentos. O app não faz pagamentos: guarda só os registos da sua organização.</Text>

      {projectId ? (
        <Card>
          <Text style={u.strong}>📋 Projeto: {projectName || "escolhido"}</Text>
          <Btn small kind="outline" label="Ver todos os projetos" onPress={() => setProjectId("")} />
        </Card>
      ) : null}

      <View style={u.grid}>
        {tiles.map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={[u.tileValue, { fontSize: 16 }]}>{money(value)}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>

      <Btn label="➕ Novo financiamento" onPress={() => navigation.navigate("NgoFundingForm", { projectId: projectId || undefined })} />
      <View style={u.row}>
        <Btn small kind="outline" label="💸 Despesas" onPress={() => navigation.navigate("NgoExpenses", { projectId: projectId || undefined })} />
        <Btn small kind="outline" label="📑 Relatório financeiro" onPress={() => navigation.navigate("NgoFinanceReport", { projectId: projectId || undefined })} />
      </View>
      <View style={u.row}>
        <Btn small kind="outline" label="🔎 Financiamentos disponíveis" onPress={() => navigation.navigate("NgoOpportunities", { kind: "FINANCIAMENTO" })} />
        <Btn small kind="outline" label="🤝 Parceiros financeiros" onPress={() => navigation.navigate("NgoPartners", { type: "FINANCEIRO" })} />
      </View>

      {d.fundedProjects.length > 0 && !projectId ? (
        <>
          <SubTitle>Projetos financiados</SubTitle>
          {d.fundedProjects.map((p: any) => (
            <Card key={p.projectId}>
              <Text style={u.strong}>{p.name}</Text>
              <Text style={u.muted}>
                💰 Recebido: {money(p.received)} · ✅ Aprovado, por receber: {money(p.approved)}
              </Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Ver projeto" onPress={() => navigation.navigate("NgoProject", { id: p.projectId })} />
                <Btn small kind="outline" label="Ver financiamentos" onPress={() => setProjectId(p.projectId)} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <SubTitle>Estado dos financiamentos</SubTitle>
      <ChipGroup
        options={catalog.fundingStatus.map((s) => ({ value: s.value, label: `${s.label} (${d.summary.byStatus[s.value]?.count ?? 0})` }))}
        value={status}
        onChange={setStatus}
        allowEmpty
        scroll
      />
      <ChipGroup label="Tipo" options={catalog.fundingKinds} value={kind} onChange={setKind} allowEmpty scroll />

      {d.items.length === 0 ? (
        <Empty text="Nenhum financiamento registado com estes filtros." />
      ) : (
        d.items.map((f: any) => {
          const overdue = f.dueDate && PENDING.includes(f.status) && new Date(f.dueDate).getTime() < Date.now();
          return (
            <Card key={f.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{f.title}</Text>
                <Badge label={labelOf(catalog.fundingStatus, f.status)} color={colorOf(FUNDING_STATUS_COLOR, f.status)} />
              </View>

              <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 4 }}>{money(f.amount)}</Text>
              <Text style={u.muted}>{labelOf(catalog.fundingKinds, f.kind)}</Text>
              {f.projectName ? <Text style={u.muted}>📋 {f.projectName}</Text> : null}
              {f.partnerName ? <Text style={u.muted}>🤝 {f.partnerName}</Text> : null}

              {f.requestedAt ? <Text style={u.muted}>📨 Pedido em {formatDate(f.requestedAt)}</Text> : null}
              {f.approvedAt ? <Text style={u.muted}>✅ Aprovado em {formatDate(f.approvedAt)}</Text> : null}
              {f.receivedAt ? <Text style={u.muted}>💰 Recebido em {formatDate(f.receivedAt)}</Text> : null}
              {f.dueDate ? (
                <Text style={{ marginTop: 2, color: overdue ? "#C62828" : undefined }} >
                  {overdue ? "⚠️ " : "⏳ "}Data limite: {formatDate(f.dueDate)}
                </Text>
              ) : null}
              {f.notes ? <Text style={[u.muted, { marginTop: 4 }]}>📝 {f.notes}</Text> : null}

              <View style={u.row}>
                {(NEXT[f.status] ?? []).map((step) => (
                  <Btn key={step.to} small kind={step.kind ?? "primary"} label={step.label} onPress={() => change(f, step)} />
                ))}
                <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoFundingForm", { funding: f })} />
                <Btn small kind="danger" label="Apagar" onPress={() => remove(f)} />
              </View>
            </Card>
          );
        })
      )}
    </Page>
  );
}
