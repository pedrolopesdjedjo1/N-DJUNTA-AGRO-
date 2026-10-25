import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ClientChooser from "../components/agent/ClientChooser";
import { createAgentTask, updateAgentTask, getAgentClient } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { TASK_KIND_ICON } from "../constants/agentTasks";
import { getApiErrorMessage } from "../api/errorMessage";

export default function AgentTaskFormScreen({ navigation, route }: any) {
  const editing = route?.params?.task;
  const catalog = useAgentCatalog();

  const [title, setTitle] = useState<string>(editing?.title ?? "");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [kind, setKind] = useState<string>(editing?.kind ?? "GERAL");
  const [priority, setPriority] = useState<string>(editing?.priority ?? "NORMAL");
  const [dueText, setDueText] = useState<string>(isoToDateText(editing?.dueDate));
  const [linkId, setLinkId] = useState<string>(editing?.linkId ?? route?.params?.linkId ?? "");
  const [clientName, setClientName] = useState<string>(editing?.clientName ?? route?.params?.clientName ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (linkId && !clientName) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o título da tarefa.");
      return;
    }
    if (dueText.trim() && !isDateText(dueText.trim())) {
      Alert.alert("Atenção", "A data limite deve ser assim: AAAA-MM-DD (ex: 2026-11-05).");
      return;
    }

    const body: Record<string, any> = {
      title: title.trim(),
      description: description.trim(),
      kind,
      priority,
    };

    // Uma data que já passou só se valida quando a pessoa a muda
    const dueChanged = dueText.trim() !== isoToDateText(editing?.dueDate);
    if (!editing || dueChanged) {
      body.dueDate = dueText.trim() ? dateToIso(dueText.trim()) : null;
    }

    if (editing) body.linkId = linkId || "";
    else if (linkId) body.linkId = linkId;

    setSaving(true);
    try {
      if (editing) await updateAgentTask(editing.id, body);
      else await createAgentTask(body);

      Alert.alert("Pronto", editing ? "Tarefa atualizada." : "Tarefa criada.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a tarefa."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar tarefa" : "☑️ Nova tarefa"}</Title>

      <Field label="O que tem de fazer" value={title} onChangeText={setTitle} placeholder="Ex: Visitar a bolanha do Alfa em Sonaco" />
      <Field label="Detalhes (opcional)" value={description} onChangeText={setDescription} multiline />

      <ChipGroup
        label="Tipo"
        options={catalog.taskKinds.map((k) => ({ ...k, icon: TASK_KIND_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
      />
      <ChipGroup label="Prioridade" options={catalog.taskPriority} value={priority} onChange={setPriority} />

      <Field label="Data limite (AAAA-MM-DD, opcional)" value={dueText} onChangeText={setDueText} placeholder="2026-11-05" />
      <View style={u.row}>
        <Chip label="Hoje" active={dueText === todayText()} onPress={() => setDueText(todayText())} />
        <Chip label="Amanhã" active={dueText === todayText(1)} onPress={() => setDueText(todayText(1))} />
        <Chip label="Em 3 dias" active={dueText === todayText(3)} onPress={() => setDueText(todayText(3))} />
        <Chip label="Em 7 dias" active={dueText === todayText(7)} onPress={() => setDueText(todayText(7))} />
        {dueText ? <Chip label="Sem data" active={false} onPress={() => setDueText("")} /> : null}
      </View>

      <ClientChooser
        label="Cliente a que se refere (opcional)"
        linkId={linkId}
        clientName={clientName}
        onChange={(id, name) => {
          setLinkId(id);
          setClientName(name);
        }}
      />

      <Text style={[u.muted, { marginTop: 8 }]}>As tarefas atrasadas e as de hoje aparecem nos alertas do seu início.</Text>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Criar tarefa"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
