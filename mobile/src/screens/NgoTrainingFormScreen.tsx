import React, { useEffect, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createTraining, updateTraining, listNgoProjects } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { getPosition } from "../utils/location";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { dateToIso, isDateText, isTimeText, isoToDateText, isoToTimeText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function NgoTrainingFormScreen({ navigation, route }: any) {
  const editing = route?.params?.training;
  const catalog = useNgoCatalog();

  const [title, setTitle] = useState<string>(editing?.title ?? "");
  const [kind, setKind] = useState<string>(editing?.kind ?? "CURSO");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [area, setArea] = useState<string>(editing?.area ?? "");
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? route?.params?.projectId ?? "");
  const [isOnline, setIsOnline] = useState<boolean>(!!editing?.isOnline);
  const [onlineLink, setOnlineLink] = useState<string>(editing?.onlineLink ?? "");
  const [location, setLocation] = useState<string>(editing?.location ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [startDate, setStartDate] = useState<string>(isoToDateText(editing?.startsAt) || todayText(7));
  const [startTime, setStartTime] = useState<string>(isoToTimeText(editing?.startsAt) || "09:00");
  const [endDate, setEndDate] = useState<string>(isoToDateText(editing?.endsAt));
  const [endTime, setEndTime] = useState<string>(isoToTimeText(editing?.endsAt) || "");
  const [hours, setHours] = useState<string>(editing?.hours ? String(editing.hours) : "");
  const [capacity, setCapacity] = useState<string>(editing?.capacity ? String(editing.capacity) : "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    editing && editing.lat !== null && editing.lng !== null && editing.lat !== undefined ? { lat: editing.lat, lng: editing.lng } : null
  );
  const [regions, setRegions] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loader = useLoader(async () => (await listNgoProjects() as any).projects as any[], [] as any[]);
  const projects: any[] = loader.data;

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  async function useMyLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app. Estando no local da formação, o ponto fica exato no mapa.");
    }
  }

  async function save() {
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o título da formação.");
      return;
    }
    if (!isDateText(startDate.trim()) || !isTimeText(startTime.trim())) {
      Alert.alert("Atenção", "Escreva a data de início assim: AAAA-MM-DD (ex: 2026-11-15) e a hora assim: HH:MM (ex: 09:00).");
      return;
    }

    let endsAt: string | null = null;
    if (endDate.trim()) {
      const time = endTime.trim() || "17:00";
      if (!isDateText(endDate.trim()) || !isTimeText(time)) {
        Alert.alert("Atenção", "Escreva a data de fim assim: AAAA-MM-DD e a hora assim: HH:MM.");
        return;
      }
      endsAt = dateToIso(endDate.trim(), time);
      if (new Date(endsAt).getTime() < new Date(dateToIso(startDate.trim(), startTime.trim())).getTime()) {
        Alert.alert("Atenção", "O fim deve ser depois do início.");
        return;
      }
    }

    if (!isOnline && !location.trim()) {
      Alert.alert("Atenção", "Escreva o local da formação, ou ligue a opção Formação online.");
      return;
    }
    if (isOnline && onlineLink.trim() && !/^https:\/\/\S+$/i.test(onlineLink.trim())) {
      Alert.alert("Atenção", "O endereço da sessão online deve começar por https://");
      return;
    }

    const hoursNumber = hours.trim() ? parseInt(hours, 10) : null;
    if (hoursNumber !== null && (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 400)) {
      Alert.alert("Atenção", "A carga horária deve ser de 1 a 400 horas.");
      return;
    }
    const capacityNumber = capacity.trim() ? parseInt(capacity, 10) : null;
    if (capacityNumber !== null && (isNaN(capacityNumber) || capacityNumber < 1)) {
      Alert.alert("Atenção", "O número de vagas deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: title.trim(),
        kind,
        description: description.trim(),
        area: area || null,
        projectId: projectId || null,
        isOnline,
        onlineLink: isOnline ? onlineLink.trim() : "",
        location: location.trim(),
        region: region.trim(),
        startsAt: dateToIso(startDate.trim(), startTime.trim()),
        endsAt,
        hours: hoursNumber,
        capacity: capacityNumber,
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
      };

      if (editing) {
        await updateTraining(editing.id, body);
        Alert.alert("Pronto", "Formação atualizada.");
        navigation.goBack();
      } else {
        const created = await createTraining(body);
        if (created?.id && navigation.replace) navigation.replace("NgoTraining", { id: created.id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a formação."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>{editing ? "✏️ Editar formação" : "➕ Nova formação"}</Title>

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Técnicas de conservação do pescado" />
      <ChipGroup label="Tipo" options={catalog.trainingKinds} value={kind} onChange={setKind} />
      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que se aprende, para quem é, o que trazer" />

      <ChipGroup label="Área (opcional)" options={catalog.areas} value={area} onChange={setArea} allowEmpty emptyLabel="Nenhuma" scroll />

      {projects.length > 0 ? (
        <>
          <Text style={u.label}>Projeto (opcional)</Text>
          <View style={u.row}>
            <Chip label="Nenhum" active={projectId === ""} onPress={() => setProjectId("")} />
            {projects.map((p) => (
              <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
            ))}
          </View>
        </>
      ) : null}

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>Formação online</Text>
            <Text style={u.muted}>O endereço da sessão só é visto por quem se inscreveu.</Text>
          </View>
          <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      {isOnline ? (
        <Field label="Endereço da sessão (https://..., opcional)" value={onlineLink} onChangeText={setOnlineLink} autoCapitalize="none" placeholder="https://meet.google.com/..." />
      ) : null}

      <Field
        label={isOnline ? "Local (opcional)" : "Local da formação"}
        value={location}
        onChangeText={setLocation}
        placeholder="Ex: Centro comunitário de Sonaco"
      />

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      {!isOnline ? (
        <>
          <Text style={u.label}>📍 Ponto no mapa (centros de formação)</Text>
          <Text style={u.muted}>{coords ? `Guardado: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem coordenadas. Aparece no centro da região."}</Text>
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
        </>
      ) : null}

      <Field label="Data de início (AAAA-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-11-15" />
      <View style={u.row}>
        <Chip label="Amanhã" active={startDate === todayText(1)} onPress={() => setStartDate(todayText(1))} />
        <Chip label="Em 7 dias" active={startDate === todayText(7)} onPress={() => setStartDate(todayText(7))} />
        <Chip label="Em 14 dias" active={startDate === todayText(14)} onPress={() => setStartDate(todayText(14))} />
        <Chip label="Em 30 dias" active={startDate === todayText(30)} onPress={() => setStartDate(todayText(30))} />
      </View>
      <Field label="Hora de início (HH:MM)" value={startTime} onChangeText={setStartTime} placeholder="09:00" />

      <Field label="Data de fim (AAAA-MM-DD, opcional)" value={endDate} onChangeText={setEndDate} placeholder="Deixe vazio se for no mesmo dia" />
      {endDate.trim() ? <Field label="Hora de fim (HH:MM)" value={endTime} onChangeText={setEndTime} placeholder="17:00" /> : null}
      <View style={u.row}>
        <Chip label="Mesmo dia" active={endDate === startDate} onPress={() => setEndDate(startDate)} />
        {endDate ? <Chip label="Sem data de fim" active={false} onPress={() => setEndDate("")} /> : null}
      </View>

      <Field
        label="Carga horária em horas (opcional)"
        value={hours}
        onChangeText={(v) => setHours(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 8"
      />
      <Field
        label="Número de vagas (opcional)"
        value={capacity}
        onChangeText={(v) => setCapacity(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 30"
      />

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Criar formação"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
