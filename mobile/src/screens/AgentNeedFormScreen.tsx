import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ClientChooser from "../components/agent/ClientChooser";
import { createAgentNeed, updateAgentNeed, getAgentClient } from "../api/agent";
import { getGovRegions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { NEED_ICON } from "../constants/agentTasks";
import { getApiErrorMessage } from "../api/errorMessage";

export default function AgentNeedFormScreen({ navigation, route }: any) {
  const params = route?.params ?? {};
  const editing = params.need;
  const catalog = useAgentCatalog();

  const [category, setCategory] = useState<string>(editing?.category ?? "");
  const [priority, setPriority] = useState<string>(editing?.priority ?? "MEDIA");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [people, setPeople] = useState<string>(editing?.peopleAffected ? String(editing.peopleAffected) : "");
  const [regionKey, setRegionKey] = useState<string>(editing?.regionKey ?? params.regionKey ?? "");
  const [locality, setLocality] = useState<string>(editing?.locality ?? params.locality ?? "");
  const [linkId, setLinkId] = useState<string>(editing?.linkId ?? params.linkId ?? "");
  const [clientName, setClientName] = useState<string>(editing?.clientName ?? params.clientName ?? "");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (linkId && !clientName) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de necessidade.");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert("Atenção", "Descreva a necessidade (pelo menos 10 letras).");
      return;
    }
    if (!regionKey && !locality.trim() && !linkId) {
      Alert.alert("Atenção", "Indique a região, a comunidade ou o cliente a quem se refere.");
      return;
    }

    const count = people.trim() ? parseInt(people, 10) : null;
    if (count !== null && (isNaN(count) || count < 0)) {
      Alert.alert("Atenção", "O número de pessoas deve ser um número.");
      return;
    }

    const body: Record<string, any> = {
      category,
      priority,
      description: description.trim(),
      regionKey: regionKey || (editing ? null : undefined),
      locality: locality.trim() || (editing ? null : undefined),
      peopleAffected: count ?? (editing ? null : undefined),
    };
    if (editing) body.linkId = linkId || "";
    else if (linkId) body.linkId = linkId;

    setSaving(true);
    try {
      if (editing) await updateAgentNeed(editing.id, body);
      else await createAgentNeed(body);

      Alert.alert("Pronto", editing ? "Necessidade atualizada." : "Necessidade registada. Pode encaminhá-la a uma instituição.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a necessidade."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar necessidade" : "📍 Registar necessidade"}</Title>
      <Text style={u.muted}>O que falta a uma pessoa ou a uma comunidade? Depois pode encaminhar a uma instituição pública.</Text>

      <ChipGroup
        label="Tipo de necessidade"
        options={catalog.needCategories.map((k) => ({ ...k, icon: NEED_ICON[k.value] }))}
        value={category}
        onChange={setCategory}
      />
      <ChipGroup label="Prioridade" options={catalog.needPriority} value={priority} onChange={setPriority} />

      <Field
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Ex: Faltam sementes de arroz para 40 famílias antes das chuvas"
      />
      <Field
        label="Pessoas afetadas (opcional)"
        value={people}
        onChangeText={(v) => setPeople(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 40"
      />

      <Text style={u.label}>Região</Text>
      <View style={u.row}>
        {regions.map((r) => (
          <Chip key={r.key} label={r.name} active={regionKey === r.key} onPress={() => setRegionKey(regionKey === r.key ? "" : r.key)} />
        ))}
      </View>
      <Field label="Comunidade ou localidade (opcional)" value={locality} onChangeText={setLocality} placeholder="Ex: Sonaco" />

      <ClientChooser
        label="Cliente a que se refere (opcional)"
        linkId={linkId}
        clientName={clientName}
        onChange={(id, name) => {
          setLinkId(id);
          setClientName(name);
        }}
      />
      <Text style={u.muted}>Se não indicar o local, usamos o local do cliente escolhido.</Text>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar necessidade"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
