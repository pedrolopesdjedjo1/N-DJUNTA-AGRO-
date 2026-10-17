import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createNeed, updateNeed, listCommunities, listNgoProjects } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

const EMPTY = { communities: [] as any[], projects: [] as any[] };

export default function NgoNeedFormScreen({ navigation, route }: any) {
  const editing = route?.params?.need;
  const catalog = useNgoCatalog();

  const [communityId, setCommunityId] = useState<string>(editing?.communityId ?? route?.params?.communityId ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [category, setCategory] = useState<string>(editing?.category ?? "");
  const [priority, setPriority] = useState<string>(editing?.priority ?? "MEDIA");
  const [status, setStatus] = useState<string>(editing?.status ?? "IDENTIFICADA");
  const [people, setPeople] = useState<string>(
    editing?.peopleAffected !== null && editing?.peopleAffected !== undefined ? String(editing.peopleAffected) : ""
  );
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? "");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loader = useLoader(
    async () => {
      const [communities, projects] = await Promise.all([listCommunities(), listNgoProjects()]);
      return { communities, projects: (projects as any).projects };
    },
    EMPTY
  );

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  const communities: any[] = loader.data.communities;
  const projects: any[] = loader.data.projects;
  const chosenCommunity = communities.find((c) => c.id === communityId);

  async function save() {
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de necessidade.");
      return;
    }
    if (description.trim().length < 3) {
      Alert.alert("Atenção", "Descreva a necessidade.");
      return;
    }
    if (!editing && !communityId && !region.trim()) {
      Alert.alert("Atenção", "Escolha a comunidade ou escreva a região.");
      return;
    }

    const count = people.trim() ? parseInt(people, 10) : null;
    if (count !== null && (isNaN(count) || count < 0)) {
      Alert.alert("Atenção", "O número de pessoas deve ser um número.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateNeed(editing.id, {
          description: description.trim(),
          category,
          priority,
          status,
          peopleAffected: count,
          projectId: projectId || null,
        });
      } else {
        await createNeed({
          communityId: communityId || undefined,
          region: communityId ? undefined : region.trim(),
          category,
          priority,
          description: description.trim(),
          peopleAffected: count ?? undefined,
          projectId: projectId || undefined,
        });
      }
      Alert.alert("Pronto", editing ? "Necessidade atualizada." : "Necessidade registada.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a necessidade."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>{editing ? "✏️ Editar necessidade" : "📍 Identificar necessidade"}</Title>

      {editing ? (
        <Card>
          <Text style={u.muted}>Onde</Text>
          <Text style={u.strong}>{editing.communityName ?? editing.region ?? "—"}</Text>
          <Text style={u.muted}>A comunidade e a região não se mudam depois de registadas.</Text>
        </Card>
      ) : (
        <>
          <Text style={u.label}>Comunidade</Text>
          {communities.length === 0 ? (
            <Card>
              <Text style={u.muted}>Ainda não registou comunidades. Pode escrever só a região abaixo, ou registar a comunidade primeiro.</Text>
              <Btn small kind="outline" label="➕ Registar comunidade" onPress={() => navigation.navigate("NgoCommunityForm")} />
            </Card>
          ) : (
            <View style={u.row}>
              <Chip label="Sem comunidade" active={communityId === ""} onPress={() => setCommunityId("")} />
              {communities.map((c) => (
                <Chip key={c.id} label={c.name} active={communityId === c.id} onPress={() => setCommunityId(communityId === c.id ? "" : c.id)} />
              ))}
            </View>
          )}

          {chosenCommunity ? (
            <Text style={u.muted}>📍 {chosenCommunity.region}</Text>
          ) : (
            <>
              <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Bafatá" />
              {regions.length > 0 ? (
                <View style={u.row}>
                  {regions.map((r) => (
                    <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </>
      )}

      <ChipGroup label="Tipo de necessidade" options={catalog.needCategories} value={category} onChange={setCategory} />
      <ChipGroup label="Prioridade" options={catalog.needPriority} value={priority} onChange={setPriority} />

      {editing ? <ChipGroup label="Estado" options={catalog.needStatus} value={status} onChange={setStatus} /> : null}

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

      {projects.length > 0 ? (
        <>
          <Text style={u.label}>Projeto que responde a esta necessidade (opcional)</Text>
          <View style={u.row}>
            <Chip label="Nenhum" active={projectId === ""} onPress={() => setProjectId("")} />
            {projects.map((p) => (
              <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
            ))}
          </View>
          {projectId ? <Text style={u.muted}>{labelOf(catalog.projectStatus, projects.find((p) => p.id === projectId)?.status)}</Text> : null}
        </>
      ) : null}

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar necessidade"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
