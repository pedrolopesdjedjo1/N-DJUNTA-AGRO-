import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ProgressBar from "../components/ProgressBar";
import { listExpenses, createExpense, deleteExpense, listNgoProjects, listFunding } from "../api/ngo";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { dateToIso, isDateText, todayText } from "../utils/dates";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

const EMPTY = { expenses: { total: 0, byCategory: [] as any[], items: [] as any[] }, projects: [] as any[], funding: [] as any[] };

export default function NgoExpensesScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const [projectId, setProjectId] = useState<string>(route?.params?.projectId ?? "");
  const [category, setCategory] = useState("");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const loader = useLoader(
    async () => {
      const [expenses, projects, funding] = await Promise.all([
        listExpenses({ projectId, category, from: range.from, to: range.to }),
        listNgoProjects(),
        listFunding(),
      ]);
      return { expenses, projects: (projects as any).projects, funding: (funding as any).items };
    },
    EMPTY,
    [projectId, category, range]
  );

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const d: any = loader.data;
  const projects: any[] = d.projects;
  const fundings: any[] = (d.funding as any[]).filter((f) => f.status === "RECEBIDO" || f.status === "APROVADO");
  const maxCategory = Math.max(1, ...d.expenses.byCategory.map((c: any) => c.amount));

  const [open, setOpen] = useState(false);
  const [fCategory, setFCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayText());
  const [fProject, setFProject] = useState<string>(route?.params?.projectId ?? "");
  const [fFunding, setFFunding] = useState("");
  const [receipt, setReceipt] = useState<{ uri: string; base64: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function applyRange() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-10-01).");
      return;
    }
    setRange({ from: fromText.trim(), to: toText.trim() });
  }

  function clearRange() {
    setFromText("");
    setToText("");
    setRange({ from: "", to: "" });
  }

  async function addReceipt(fromCamera: boolean) {
    const picked = await pickImage(fromCamera);
    if (picked) setReceipt({ uri: picked.uri, base64: picked.base64 });
  }

  async function save() {
    if (!fCategory) {
      Alert.alert("Atenção", "Escolha o tipo de despesa.");
      return;
    }
    if (description.trim().length < 3) {
      Alert.alert("Atenção", "Descreva a despesa.");
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!amount.trim() || isNaN(value) || value <= 0) {
      Alert.alert("Atenção", "Escreva o valor em FCFA.");
      return;
    }
    if (!isDateText(date.trim())) {
      Alert.alert("Atenção", "A data deve ser assim: AAAA-MM-DD.");
      return;
    }

    setSaving(true);
    try {
      const receiptUrl = receipt ? await uploadImageBase64(receipt.base64, "despesa-") : undefined;
      await createExpense({
        category: fCategory,
        description: description.trim(),
        amount: value,
        spentAt: dateToIso(date.trim()),
        projectId: fProject || undefined,
        fundingId: fFunding || undefined,
        receiptUrl,
      });

      setDescription("");
      setAmount("");
      setReceipt(null);
      setOpen(false);
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a despesa."));
    } finally {
      setSaving(false);
    }
  }

  function remove(item: any) {
    Alert.alert("Apagar despesa", `Apagar "${item.description}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExpense(item.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <Title>💸 Despesas</Title>

      <Card>
        <Text style={u.muted}>Total gasto{range.from || range.to ? " no período" : ""}</Text>
        <Text style={{ fontSize: 26, fontWeight: "bold" }}>{money(d.expenses.total)}</Text>
      </Card>

      <Btn label={open ? "Fechar formulário" : "➕ Registar despesa"} onPress={() => setOpen(!open)} />

      {open ? (
        <Card>
          <ChipGroup label="Tipo de despesa" options={catalog.expenseCategories} value={fCategory} onChange={setFCategory} />
          <Field label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex: Compra de 200 kg de sementes de arroz" />
          <Field label="Valor (FCFA)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />

          {projects.length > 0 ? (
            <>
              <Text style={u.label}>Projeto (opcional)</Text>
              <View style={u.row}>
                <Chip label="Nenhum" active={fProject === ""} onPress={() => setFProject("")} />
                {projects.map((p) => (
                  <Chip key={p.id} label={p.name} active={fProject === p.id} onPress={() => setFProject(fProject === p.id ? "" : p.id)} />
                ))}
              </View>
            </>
          ) : null}

          {fundings.length > 0 ? (
            <>
              <Text style={u.label}>Pago com o financiamento (opcional)</Text>
              <View style={u.row}>
                <Chip label="Nenhum" active={fFunding === ""} onPress={() => setFFunding("")} />
                {fundings.map((f) => (
                  <Chip key={f.id} label={f.title} active={fFunding === f.id} onPress={() => setFFunding(fFunding === f.id ? "" : f.id)} />
                ))}
              </View>
            </>
          ) : null}

          <Text style={u.label}>🧾 Foto do comprovativo (opcional)</Text>
          {receipt ? <Image source={{ uri: receipt.uri }} style={{ width: 120, height: 120, borderRadius: 8, marginTop: 6 }} /> : null}
          <View style={u.row}>
            <Btn small kind="outline" label="Galeria" onPress={() => addReceipt(false)} />
            <Btn small kind="outline" label="Câmera" onPress={() => addReceipt(true)} />
            {receipt ? <Btn small kind="danger" label="Remover" onPress={() => setReceipt(null)} /> : null}
          </View>
          <Text style={u.muted}>O comprovativo fica no armazenamento de fotos do app. Não envie documentos com dados pessoais.</Text>

          <Btn label={saving ? "A guardar..." : "Guardar despesa"} onPress={save} disabled={saving} />
        </Card>
      ) : null}

      <SubTitle>Filtros</SubTitle>
      {projects.length > 0 ? (
        <View style={u.row}>
          <Chip label="Todos os projetos" active={projectId === ""} onPress={() => setProjectId("")} />
          {projects.map((p) => (
            <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
          ))}
        </View>
      ) : null}
      <ChipGroup label="Tipo de despesa" options={catalog.expenseCategories} value={category} onChange={setCategory} allowEmpty scroll />

      <View style={u.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-10-01" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-10-31" />
        </View>
      </View>
      <View style={u.row}>
        <Btn small kind="outline" label="Aplicar datas" onPress={applyRange} />
        {range.from || range.to ? <Btn small kind="outline" label="Limpar datas" onPress={clearRange} /> : null}
        <Btn small kind="outline" label="📑 Relatório financeiro" onPress={() => navigation.navigate("NgoFinanceReport", { projectId: projectId || undefined })} />
      </View>

      {d.expenses.byCategory.length > 0 ? (
        <>
          <SubTitle>Por tipo de despesa</SubTitle>
          <Card>
            {d.expenses.byCategory.map((c: any) => (
              <View key={c.category} style={{ marginTop: 6 }}>
                <View style={u.between}>
                  <Text style={{ flex: 1, marginRight: 8 }}>{c.label}</Text>
                  <Text style={{ fontWeight: "bold" }}>{money(c.amount)}</Text>
                </View>
                <ProgressBar percent={(c.amount / maxCategory) * 100} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SubTitle>Lista de despesas</SubTitle>
      {d.expenses.items.length === 0 ? (
        <Empty text="Nenhuma despesa registada com estes filtros." />
      ) : (
        d.expenses.items.map((e: any) => (
          <Card key={e.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{e.description}</Text>
              <Text style={{ fontWeight: "bold" }}>{money(e.amount)}</Text>
            </View>
            <Text style={u.muted}>
              {labelOf(catalog.expenseCategories, e.category)} · {formatDate(e.spentAt)}
            </Text>
            {e.projectName ? <Text style={u.muted}>📋 {e.projectName}</Text> : null}
            <View style={u.row}>
              {e.receiptUrl ? <Btn small kind="outline" label="🧾 Ver comprovativo" onPress={() => Linking.openURL(e.receiptUrl)} /> : null}
              <Btn small kind="danger" label="Apagar" onPress={() => remove(e)} />
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
