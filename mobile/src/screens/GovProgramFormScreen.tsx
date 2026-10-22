import React, { useEffect, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createProgram, updateProgram, getGovRegions } from "../api/gov";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function GovProgramFormScreen({ navigation, route }: any) {
  const editing = route?.params?.program;
  const catalog = useNgoCatalog();

  const [name, setName] = useState<string>(editing?.name ?? "");
  const [area, setArea] = useState<string>(editing?.area ?? route?.params?.area ?? "");
  const [status, setStatus] = useState<string>(editing?.status ?? "PLANEAMENTO");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [objectives, setObjectives] = useState<string>(editing?.objectives ?? "");
  const [regions, setRegions] = useState<string[]>(editing?.regions ?? []);
  const [startDate, setStartDate] = useState<string>(isoToDateText(editing?.startDate));
  const [endDate, setEndDate] = useState<string>(isoToDateText(editing?.endDate));
  const [budget, setBudget] = useState<string>(editing?.budget !== null && editing?.budget !== undefined ? String(editing.budget) : "");
  const [target, setTarget] = useState<string>(editing?.targetBeneficiaries ? String(editing.targetBeneficiaries) : "");
  const [isPublic, setIsPublic] = useState<boolean>(editing ? editing.isPublic !== false : true);
  const [regionNames, setRegionNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegionNames(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  function toggleRegion(value: string) {
    setRegions((prev) => (prev.includes(value) ? prev.filter((r) => r !== value) : prev.length >= 12 ? prev : [...prev, value]));
  }

  async function save() {
    if (name.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o nome do programa.");
      return;
    }
    if (!area) {
      Alert.alert("Atenção", "Escolha a área do programa.");
      return;
    }
    if (startDate.trim() && !isDateText(startDate.trim())) {
      Alert.alert("Atenção", "A data de início deve ser assim: AAAA-MM-DD (ex: 2026-11-15).");
      return;
    }
    if (endDate.trim() && !isDateText(endDate.trim())) {
      Alert.alert("Atenção", "A data de término deve ser assim: AAAA-MM-DD (ex: 2027-12-31).");
      return;
    }
    if (startDate.trim() && endDate.trim() && endDate.trim() < startDate.trim()) {
      Alert.alert("Atenção", "A data de término deve ser depois da data de início.");
      return;
    }

    const budgetNumber = budget.trim() ? Number(budget.replace(",", ".")) : null;
    if (budgetNumber !== null && (isNaN(budgetNumber) || budgetNumber < 0)) {
      Alert.alert("Atenção", "O orçamento deve ser um número.");
      return;
    }
    const targetNumber = target.trim() ? parseInt(target, 10) : null;
    if (targetNumber !== null && (isNaN(targetNumber) || targetNumber < 0)) {
      Alert.alert("Atenção", "A meta de beneficiários deve ser um número.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        area,
        status,
        description: description.trim(),
        objectives: objectives.trim(),
        regions,
        startDate: startDate.trim() ? dateToIso(startDate.trim()) : null,
        endDate: endDate.trim() ? dateToIso(endDate.trim()) : null,
        budget: budgetNumber,
        targetBeneficiaries: targetNumber,
        isPublic,
      };

      if (editing) {
        await updateProgram(editing.id, body);
        Alert.alert("Pronto", "Programa atualizado.");
        navigation.goBack();
      } else {
        const created = await createProgram(body);
        const id = created?.program?.id;
        if (id && navigation.replace) navigation.replace("GovProgram", { id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o programa."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar programa" : "➕ Novo programa"}</Title>
      <Text style={u.muted}>Um programa junta vários projetos com o mesmo objetivo, por exemplo "Segurança alimentar 2027".</Text>

      <Field label="Nome do programa" value={name} onChangeText={setName} placeholder="Ex: Programa nacional de sementes de arroz" />
      <ChipGroup label="Área" options={catalog.areas} value={area} onChange={setArea} />
      <ChipGroup label="Estado do programa" options={catalog.projectStatus} value={status} onChange={setStatus} />

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que é o programa e a quem ajuda" />
      <Field label="Objetivos" value={objectives} onChangeText={setObjectives} multiline placeholder="O que se quer alcançar" />

      <Text style={u.label}>Regiões de atuação (vazio = todo o país)</Text>
      <View style={u.row}>
        {regionNames.map((r) => (
          <Chip key={r} label={r} active={regions.includes(r)} onPress={() => toggleRegion(r)} />
        ))}
        {regions.length > 0 ? <Chip label="Limpar" active={false} onPress={() => setRegions([])} /> : null}
      </View>

      <Field label="Data de início (AAAA-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-11-15" />
      <View style={u.row}>
        <Chip label="Hoje" active={startDate === todayText()} onPress={() => setStartDate(todayText())} />
        <Chip label="Daqui a 1 mês" active={startDate === todayText(30)} onPress={() => setStartDate(todayText(30))} />
      </View>
      <Field label="Data de término (AAAA-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2027-12-31" />
      <View style={u.row}>
        <Chip label="Daqui a 1 ano" active={endDate === todayText(365)} onPress={() => setEndDate(todayText(365))} />
        <Chip label="Daqui a 2 anos" active={endDate === todayText(730)} onPress={() => setEndDate(todayText(730))} />
      </View>

      <Field label="Orçamento (FCFA, opcional)" value={budget} onChangeText={setBudget} keyboardType="numeric" />
      <Field
        label="Meta de beneficiários (opcional)"
        value={target}
        onChangeText={(v) => setTarget(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 5000"
      />

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>Programa público</Text>
            <Text style={u.muted}>
              {isPublic ? "Aparece aos cidadãos no app (sem o orçamento)." : "Só a sua instituição vê este programa."}
            </Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Criar programa"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
