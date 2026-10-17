import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getNgoProject, createNgoProject, updateNgoProject } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getPosition } from "../utils/location";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function NgoProjectFormScreen({ navigation, route }: any) {
  const editId: string | undefined = route?.params?.id;
  const catalog = useNgoCatalog();

  const [name, setName] = useState("");
  const [area, setArea] = useState<string>(route?.params?.area ?? "");
  const [focus, setFocus] = useState<string>(route?.params?.focus ?? "");
  const [status, setStatus] = useState("PLANEAMENTO");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [region, setRegion] = useState("");
  const [communities, setCommunities] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [target, setTarget] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);

  const loader = useLoader(async () => (editId ? getNgoProject(editId) : null), null as any, [editId]);

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId || filled || loader.loading || !loader.data) return;
    const p = loader.data.project;
    setName(p.name ?? "");
    setArea(p.area ?? "");
    setFocus(p.focus ?? "");
    setStatus(p.status ?? "PLANEAMENTO");
    setDescription(p.description ?? "");
    setObjectives(p.objectives ?? "");
    setRegion(p.region ?? "");
    setCommunities((p.communities ?? []).join(", "));
    setStartDate(isoToDateText(p.startDate));
    setEndDate(isoToDateText(p.endDate));
    setBudget(p.budget !== null && p.budget !== undefined ? String(p.budget) : "");
    setTarget(p.targetBeneficiaries !== null && p.targetBeneficiaries !== undefined ? String(p.targetBeneficiaries) : "");
    setCoords(p.lat !== null && p.lng !== null && p.lat !== undefined ? { lat: p.lat, lng: p.lng } : null);
    setIsPublic(p.isPublic !== false);
    setCoverUri(p.coverUrl ?? null);
    setFilled(true);
  }, [loader.loading, loader.data]);

  async function chooseCover() {
    const picked = await pickImage(false, [16, 9]);
    if (picked) {
      setCoverUri(picked.uri);
      setCoverBase64(picked.base64);
      setRemoveCover(false);
    }
  }

  function clearCover() {
    setCoverUri(null);
    setCoverBase64(null);
    setRemoveCover(true);
  }

  async function useMyLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app.");
    }
  }

  async function save() {
    if (name.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o nome do projeto.");
      return;
    }
    if (!area) {
      Alert.alert("Atenção", "Escolha a área de atuação.");
      return;
    }
    if (startDate.trim() && !isDateText(startDate.trim())) {
      Alert.alert("Atenção", "A data de início deve ser assim: AAAA-MM-DD (ex: 2026-11-15).");
      return;
    }
    if (endDate.trim() && !isDateText(endDate.trim())) {
      Alert.alert("Atenção", "A data de término deve ser assim: AAAA-MM-DD (ex: 2027-03-31).");
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
      let coverUrl: string | null | undefined;
      if (coverBase64) coverUrl = await uploadImageBase64(coverBase64, "projeto-");
      else if (removeCover) coverUrl = null;

      const body: Record<string, any> = {
        name: name.trim(),
        area,
        focus: focus || null,
        status,
        description: description.trim(),
        objectives: objectives.trim(),
        region: region.trim(),
        communities: communities
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        startDate: startDate.trim() ? dateToIso(startDate.trim()) : null,
        endDate: endDate.trim() ? dateToIso(endDate.trim()) : null,
        budget: budgetNumber,
        targetBeneficiaries: targetNumber,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        isPublic,
      };
      if (coverUrl !== undefined) body.coverUrl = coverUrl;

      if (editId) {
        await updateNgoProject(editId, body);
        Alert.alert("Pronto", "Projeto atualizado.");
        navigation.goBack();
      } else {
        const created = await createNgoProject(body);
        const id = created?.project?.id;
        if (id && navigation.replace) navigation.replace("NgoProject", { id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o projeto."));
    } finally {
      setSaving(false);
    }
  }

  const focusOptions = area ? catalog.focus[area] ?? [] : [];

  return (
    <Page loader={editId ? loader : undefined}>
      <Title>{editId ? "✏️ Editar projeto" : "➕ Novo projeto"}</Title>

      <Field label="Nome do projeto" value={name} onChangeText={setName} placeholder="Ex: Sementes para as mulheres de Bafatá" />

      <ChipGroup
        label="Área de atuação"
        options={catalog.areas}
        value={area}
        onChange={(v) => {
          setArea(v);
          setFocus("");
        }}
      />

      {focusOptions.length > 0 ? (
        <ChipGroup label="Tipo de apoio" options={focusOptions} value={focus} onChange={setFocus} allowEmpty emptyLabel="Nenhum" />
      ) : null}

      <ChipGroup label="Estado do projeto" options={catalog.projectStatus} value={status} onChange={setStatus} />

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que é o projeto e a quem ajuda" />
      <Field label="Objetivos" value={objectives} onChangeText={setObjectives} multiline placeholder="O que querem alcançar" />

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Bafatá" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
          ))}
        </View>
      ) : null}

      <Field
        label="Comunidades (separe com vírgulas)"
        value={communities}
        onChangeText={setCommunities}
        placeholder="Ex: Sonaco, Pirada, Bambadinca"
      />

      <Field label="Data de início (AAAA-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-11-15" />
      <View style={u.row}>
        <Chip label="Hoje" active={startDate === todayText()} onPress={() => setStartDate(todayText())} />
        <Chip label="Daqui a 1 mês" active={startDate === todayText(30)} onPress={() => setStartDate(todayText(30))} />
      </View>
      <Field label="Data de término (AAAA-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2027-03-31" />
      <View style={u.row}>
        <Chip label="Daqui a 6 meses" active={endDate === todayText(180)} onPress={() => setEndDate(todayText(180))} />
        <Chip label="Daqui a 1 ano" active={endDate === todayText(365)} onPress={() => setEndDate(todayText(365))} />
      </View>

      <Field label="Orçamento (FCFA, opcional)" value={budget} onChangeText={setBudget} keyboardType="numeric" />
      <Field
        label="Meta de beneficiários (opcional)"
        value={target}
        onChangeText={(v) => setTarget(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 200"
      />

      <Text style={u.label}>📍 Localização no mapa</Text>
      <Text style={u.muted}>
        {coords ? `Guardada: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem coordenadas. O projeto aparece no centro da região."}
      </Text>
      <View style={u.row}>
        <Btn
          small
          kind="outline"
          label={locating ? "A procurar o sinal GPS..." : "📡 Usar a minha localização"}
          onPress={useMyLocation}
          disabled={locating}
        />
        {coords ? <Btn small kind="danger" label="Remover" onPress={() => setCoords(null)} /> : null}
      </View>

      <Text style={u.label}>📸 Foto de capa</Text>
      {coverUri ? <Image source={{ uri: coverUri }} style={{ width: "100%", height: 160, borderRadius: 10 }} /> : <Text style={u.muted}>Nenhuma foto escolhida</Text>}
      <View style={u.row}>
        <Btn small kind="outline" label="Escolher foto" onPress={chooseCover} />
        {coverUri ? <Btn small kind="danger" label="Remover" onPress={clearCover} /> : null}
      </View>

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>Projeto público</Text>
            <Text style={u.muted}>
              {isPublic
                ? "Aparece às outras pessoas no app (sem o orçamento)."
                : "Só a sua organização vê este projeto."}
            </Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      <Btn label={saving ? "A guardar..." : editId ? "Guardar alterações" : "Criar projeto"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
