import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listAgentTasks, setAgentTaskStatus, deleteAgentTask, getAgentClient } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { TASK_KIND_ICON } from "../constants/agentTasks";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = {
  counts: { pending: 0, overdue: 0, today: 0, week: 0, done: 0 },
  items: [] as any[],
};

type When = "" | "overdue" | "today" | "week";

// Tarefas pendentes do agente
export default function AgentTasksScreen({ navigation, route }: any) {
  const catalog = useAgentCatalog();

  const [linkId, setLinkId] = useState<string>(route?.params?.linkId ?? "");
  const [clientName, setClientName] = useState("");
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [when, setWhen] = useState<When>("");
  const [kind, setKind] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (route?.params?.linkId !== undefined) setLinkId(route.params.linkId ?? "");
  }, [route?.params?.linkId]);

  useEffect(() => {
    setClientName("");
    if (linkId) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
  }, [linkId]);

  const loader = useLoader(
    () => listAgentTasks({ status: tab === "done" ? "FEITA" : "", linkId, when: tab === "done" ? "" : when, kind, q }),
    EMPTY,
    [tab, linkId, when, kind, q]
  );
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function toggleDone(task: any) {
    setBusyId(task.id);
    try {
      await setAgentTaskStatus(task.id, task.status !== "FEITA");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a tarefa."));
    } finally {
      setBusyId("");
    }
  }

  function remove(task: any) {
    Alert.alert("Apagar tarefa", `Apagar "${task.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAgentTask(task.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const c = d.counts;

  return (
    <AgentLayout active="AgentHome">
      <Page loader={loader}>
        <Title>☑️ Tarefas</Title>
        <Text style={u.muted}>O que tem para fazer: contactar, visitar, acompanhar encomendas e resolver problemas.</Text>

        <Btn label="➕ Nova tarefa" onPress={() => navigation.navigate("AgentTaskForm", { linkId: linkId || undefined, clientName: clientName || undefined })} />

        {linkId ? (
          <Card>
            <Text style={u.strong}>👤 Tarefas de {clientName || "um cliente"}</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver todas" onPress={() => { setLinkId(""); navigation.setParams({ linkId: undefined }); }} />
              <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: linkId })} />
            </View>
          </Card>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["⏳ Pendentes", c.pending],
              ["⚠️ Atrasadas", c.overdue],
              ["📅 Para hoje", c.today],
              ["🗓️ Esta semana", c.week],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { color: label.includes("Atrasadas") && value > 0 ? "#C62828" : undefined }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          <Chip label={`Pendentes (${c.pending})`} active={tab === "pending"} onPress={() => setTab("pending")} />
          <Chip label={`Concluídas (${c.done})`} active={tab === "done"} onPress={() => setTab("done")} />
        </View>

        {tab === "pending" ? (
          <View style={u.row}>
            <Chip label="Todas" active={when === ""} onPress={() => setWhen("")} />
            <Chip label={`⚠️ Atrasadas (${c.overdue})`} active={when === "overdue"} onPress={() => setWhen("overdue")} />
            <Chip label={`Hoje (${c.today})`} active={when === "today"} onPress={() => setWhen("today")} />
            <Chip label={`Esta semana (${c.week})`} active={when === "week"} onPress={() => setWhen("week")} />
          </View>
        ) : null}

        <Field
          placeholder="Procurar tarefa"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
        <ChipGroup
          label="Tipo"
          options={catalog.taskKinds.map((k) => ({ ...k, icon: TASK_KIND_ICON[k.value] }))}
          value={kind}
          onChange={setKind}
          allowEmpty
          scroll
        />

        {d.items.length === 0 && !loader.loading ? (
          <Empty text={tab === "pending" ? "Não há tarefas pendentes com estes filtros. Bom trabalho!" : "Ainda não concluiu tarefas."} />
        ) : (
          d.items.map((t: any) => {
            const done = t.status === "FEITA";
            return (
              <Card key={t.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8, textDecorationLine: done ? "line-through" : "none" }]}>
                    {TASK_KIND_ICON[t.kind] ?? "☑️"} {t.title}
                  </Text>
                  {t.priority === "ALTA" ? <Badge label="Alta" color="#C62828" /> : null}
                </View>

                <Text style={u.muted}>{labelOf(catalog.taskKinds, t.kind)}</Text>
                {t.description ? <Text style={{ marginTop: 4, lineHeight: 20 }}>{t.description}</Text> : null}

                {t.clientName ? <Text style={[u.muted, { marginTop: 4 }]}>👤 {t.clientName}</Text> : null}
                {t.dueDate && !done ? (
                  <Text style={{ marginTop: 4, color: t.overdue ? "#C62828" : t.dueToday ? "#EF6C00" : undefined, fontWeight: t.overdue || t.dueToday ? "bold" : "normal" }}>
                    {t.overdue ? "⚠️ Atrasada desde " : t.dueToday ? "📅 Para hoje · " : "⏳ Até "}
                    {formatDate(t.dueDate)}
                  </Text>
                ) : null}
                {done && t.doneAt ? <Text style={{ color: "#2E7D32", marginTop: 4 }}>✅ Concluída em {formatDate(t.doneAt)}</Text> : null}

                <View style={u.row}>
                  <Btn
                    small
                    kind={done ? "outline" : "primary"}
                    label={busyId === t.id ? "..." : done ? "Reabrir" : "✅ Concluir"}
                    onPress={() => toggleDone(t)}
                    disabled={busyId === t.id}
                  />
                  {!done ? <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("AgentTaskForm", { task: t })} /> : null}
                  {t.linkId ? <Btn small kind="outline" label="Ficha" onPress={() => navigation.navigate("AgentClient", { id: t.linkId })} /> : null}
                  <Btn small kind="danger" label="Apagar" onPress={() => remove(t)} />
                </View>
              </Card>
            );
          })
        )}
      </Page>
    </AgentLayout>
  );
}
