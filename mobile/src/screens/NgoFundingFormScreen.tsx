import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createFunding, updateFunding, listNgoProjects, listPartners } from "../api/ngo";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { dateToIso, isDateText, isoToDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";

const EMPTY = { projects: [] as any[], partners: [] as any[] };

export default function NgoFundingFormScreen({ navigation, route }: any) {
  const editing = route?.params?.funding;
  const catalog = useNgoCatalog();

  const [title, setTitle] = useState<string>(editing?.title ?? "");
  const [kind, setKind] = useState<string>(editing?.kind ?? "FINANCIAMENTO");
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : "");
  const [status, setStatus] = useState<string>(editing?.status ?? "PROSPECCAO");
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? route?.params?.projectId ?? "");
  const [partnerId, setPartnerId] = useState<string>(editing?.partnerId ?? route?.params?.partnerId ?? "");
  const [dueDate, setDueDate] = useState<string>(isoToDateText(editing?.dueDate));
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const loader = useLoader(
    async () => {
      const [projects, partners] = await Promise.all([listNgoProjects(), listPartners()]);
      return { projects: (projects as any).projects, partners };
    },
    EMPTY
  );
  const projects: any[] = loader.data.projects;
  const partners: any[] = (loader.data.partners as any[]).filter((p) => p.status !== "ENCERRADO");

  async function save() {
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o nome do financiamento.");
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!amount.trim() || isNaN(value) || value <= 0) {
      Alert.alert("Atenção", "Escreva o valor em FCFA (um número maior que zero).");
      return;
    }
    if (dueDate.trim() && !isDateText(dueDate.trim())) {
      Alert.alert("Atenção", "A data limite deve ser assim: AAAA-MM-DD (ex: 2026-12-31).");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        title: title.trim(),
        kind,
        amount: value,
        status,
        projectId: projectId || (editing ? null : undefined),
        partnerId: partnerId || (editing ? null : undefined),
        dueDate: dueDate.trim() ? dateToIso(dueDate.trim()) : editing ? null : undefined,
        notes: notes.trim() || (editing ? "" : undefined),
      };

      if (editing) await updateFunding(editing.id, body);
      else await createFunding(body);

      Alert.alert("Pronto", editing ? "Financiamento atualizado." : "Financiamento registado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>{editing ? "✏️ Editar financiamento" : "💰 Novo financiamento"}</Title>

      <Field label="Nome" value={title} onChangeText={setTitle} placeholder="Ex: Subvenção para sementes 2027" />
      <ChipGroup label="Tipo" options={catalog.fundingKinds} value={kind} onChange={setKind} />
      <Field label="Valor (FCFA)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Ex: 2500000" />
      <ChipGroup label="Estado" options={catalog.fundingStatus} value={status} onChange={setStatus} />

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

      <Text style={u.label}>Quem financia (opcional)</Text>
      {partners.length > 0 ? (
        <View style={u.row}>
          <Chip label="Ninguém indicado" active={partnerId === ""} onPress={() => setPartnerId("")} />
          {partners.map((p) => (
            <Chip key={p.id} label={p.name} active={partnerId === p.id} onPress={() => setPartnerId(partnerId === p.id ? "" : p.id)} />
          ))}
        </View>
      ) : (
        <Text style={u.muted}>Ainda não registou parceiros.</Text>
      )}
      <Btn small kind="outline" label="➕ Registar parceiro financeiro" onPress={() => navigation.navigate("NgoPartnerForm", { type: "FINANCEIRO" })} />

      <Field label="Data limite (AAAA-MM-DD, opcional)" value={dueDate} onChangeText={setDueDate} placeholder="2026-12-31" />
      <View style={u.row}>
        <Chip label="Em 30 dias" active={dueDate === todayText(30)} onPress={() => setDueDate(todayText(30))} />
        <Chip label="Em 90 dias" active={dueDate === todayText(90)} onPress={() => setDueDate(todayText(90))} />
        <Chip label="Em 1 ano" active={dueDate === todayText(365)} onPress={() => setDueDate(todayText(365))} />
        {dueDate ? <Chip label="Sem data" active={false} onPress={() => setDueDate("")} /> : null}
      </View>

      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Condições, contacto, documentos pedidos..." />

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar financiamento"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
