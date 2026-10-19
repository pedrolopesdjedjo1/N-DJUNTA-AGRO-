import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createOpportunity, updateOpportunity } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { AMOUNT_LABEL, OPPORTUNITY_ICON } from "../constants/ngoContent";
import { getApiErrorMessage } from "../api/errorMessage";

export default function NgoOpportunityFormScreen({ navigation, route }: any) {
  const editing = route?.params?.opportunity;
  const catalog = useNgoCatalog();

  const [kind, setKind] = useState<string>(editing?.kind ?? route?.params?.kind ?? "PROGRAMA_APOIO");
  const [title, setTitle] = useState<string>(editing?.title ?? "");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [requirements, setRequirements] = useState<string>(editing?.requirements ?? "");
  const [benefits, setBenefits] = useState<string>(editing?.benefits ?? "");
  const [area, setArea] = useState<string>(editing?.area ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [amount, setAmount] = useState<string>(editing?.amount !== null && editing?.amount !== undefined ? String(editing.amount) : "");
  const [slots, setSlots] = useState<string>(editing?.slots ? String(editing.slots) : "");
  const [deadline, setDeadline] = useState<string>(isoToDateText(editing?.deadline));
  const [contact, setContact] = useState<string>(editing?.contact ?? "");
  const [link, setLink] = useState<string>(editing?.link ?? "");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  async function save() {
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o título da oportunidade.");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert("Atenção", "Explique a oportunidade (pelo menos 10 letras).");
      return;
    }
    if (deadline.trim() && !isDateText(deadline.trim())) {
      Alert.alert("Atenção", "A data limite deve ser assim: AAAA-MM-DD (ex: 2026-12-15).");
      return;
    }
    if (link.trim() && !/^https:\/\/\S+$/i.test(link.trim())) {
      Alert.alert("Atenção", "O endereço (link) deve começar por https://");
      return;
    }

    const amountNumber = amount.trim() ? Number(amount.replace(",", ".")) : null;
    if (amountNumber !== null && (isNaN(amountNumber) || amountNumber < 0)) {
      Alert.alert("Atenção", "O valor deve ser um número.");
      return;
    }
    const slotsNumber = slots.trim() ? parseInt(slots, 10) : null;
    if (slotsNumber !== null && (isNaN(slotsNumber) || slotsNumber < 1)) {
      Alert.alert("Atenção", "O número de vagas deve ser maior que zero.");
      return;
    }

    const body: Record<string, any> = {
      kind,
      title: title.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      benefits: benefits.trim(),
      area: area || "",
      region: region.trim(),
      amount: amountNumber === null ? "" : amountNumber,
      slots: slotsNumber === null ? "" : slotsNumber,
      contact: contact.trim(),
      link: link.trim(),
    };

    // Uma data que já passou só se valida quando a pessoa a muda
    const deadlineChanged = deadline.trim() !== isoToDateText(editing?.deadline);
    if (!editing || deadlineChanged) {
      body.deadline = deadline.trim() ? dateToIso(deadline.trim(), "23:59") : "";
    }

    setSaving(true);
    try {
      if (editing) {
        await updateOpportunity(editing.id, body);
        Alert.alert("Pronto", "Oportunidade atualizada.");
        navigation.goBack();
      } else {
        const created = await createOpportunity(body);
        Alert.alert("Publicada", "A oportunidade já aparece a todas as pessoas no app.");
        if (created?.id && navigation.replace) navigation.replace("NgoOpportunity", { id: created.id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a oportunidade."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar oportunidade" : "📢 Nova oportunidade"}</Title>

      <ChipGroup
        label="Tipo de oportunidade"
        options={catalog.opportunityKinds.map((k) => ({ ...k, icon: OPPORTUNITY_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
      />

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Bolsa de formação em conservação do pescado" />
      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que é, para quem é e como se candidatar" />
      <Field label="Quem pode candidatar-se (opcional)" value={requirements} onChangeText={setRequirements} multiline placeholder="Ex: Pescadores com mais de 18 anos, da região de Bolama" />
      <Field label="O que a pessoa recebe (opcional)" value={benefits} onChangeText={setBenefits} multiline placeholder="Ex: Formação, material e certificado" />

      <ChipGroup label="Área (opcional)" options={catalog.areas} value={area} onChange={setArea} allowEmpty emptyLabel="Qualquer área" scroll />

      <Field label="Região (opcional)" value={region} onChangeText={setRegion} placeholder="Ex: Bafatá" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Field label={AMOUNT_LABEL[kind] ?? "Valor (FCFA, opcional)"} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Field
        label="Número de vagas (opcional)"
        value={slots}
        onChangeText={(v) => setSlots(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 20"
      />

      <Field label="Data limite (AAAA-MM-DD, opcional)" value={deadline} onChangeText={setDeadline} placeholder="2026-12-15" />
      <View style={u.row}>
        <Chip label="Em 7 dias" active={deadline === todayText(7)} onPress={() => setDeadline(todayText(7))} />
        <Chip label="Em 15 dias" active={deadline === todayText(15)} onPress={() => setDeadline(todayText(15))} />
        <Chip label="Em 30 dias" active={deadline === todayText(30)} onPress={() => setDeadline(todayText(30))} />
        <Chip label="Em 60 dias" active={deadline === todayText(60)} onPress={() => setDeadline(todayText(60))} />
        {deadline ? <Chip label="Sem data limite" active={false} onPress={() => setDeadline("")} /> : null}
      </View>

      <Field label="Contacto (opcional)" value={contact} onChangeText={setContact} placeholder="Telefone, e-mail ou nome da pessoa" />
      <Field label="Link com mais informações (https://..., opcional)" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://..." />

      <Text style={u.muted}>As pessoas candidatam-se pelo app. Recebe um aviso a cada candidatura e responde na lista de candidaturas.</Text>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Publicar oportunidade"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
