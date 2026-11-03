import React, { useCallback, useRef, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import PhotoPicker from "../components/transporter/PhotoPicker";
import { Page, Title, SubTitle, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { listTrExpenses, addTrExpense, deleteTrExpense } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { EXPENSE_ICON } from "../constants/transporterMoney";
import { isDateText, todayText } from "../utils/dates";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

// Registo de despesas do veículo: combustível, manutenção, peças, taxas, alimentação...
export default function TrExpensesScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();

  const [kind, setKind] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ total: 0, count: 0 });
  const [byKind, setByKind] = useState<any[]>([]);
  const [period, setPeriod] = useState<{ from: any; to: any }>({ from: null, to: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [adding, setAdding] = useState(!!route?.params?.add);
  const [newKind, setNewKind] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayText());
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const key = JSON.stringify({ kind, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listTrExpenses({ kind, from: range.from, to: range.to, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setByKind(r.byKind);
      setPeriod({ from: r.from, to: r.to });
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as despesas."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  async function save() {
    if (!newKind) return Alert.alert("Atenção", "Escolha o tipo de despesa.");
    const value = Number(amount.replace(",", "."));
    if (!amount.trim() || isNaN(value) || value <= 0) return Alert.alert("Atenção", "Indique o valor da despesa em FCFA.");
    if (!isDateText(date.trim())) return Alert.alert("Atenção", "Escreva a data assim: AAAA-MM-DD (ex: 2026-11-03).");

    setSaving(true);
    try {
      await addTrExpense({ kind: newKind, amount: value, spentAt: date.trim(), note: note.trim() || undefined, receiptUrl: receipt ?? undefined });
      setNewKind("");
      setAmount("");
      setDate(todayText());
      setNote("");
      setReceipt(null);
      setAdding(false);
      load(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a despesa."));
    } finally {
      setSaving(false);
    }
  }

  function remove(e: any) {
    Alert.alert("Apagar a despesa", `Apagar ${money(e.amount)} (${labelOf(catalog.expenseKinds, e.kind) || e.kind})?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrExpense(e.id);
            load(true);
          } catch (err) {
            Alert.alert("Atenção", getApiErrorMessage(err, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <TrLayout active="TrEarnings">
      <Page>
        <Title>🧾 Despesas do veículo</Title>
        <Text style={u.muted}>Registe o que gasta com o veículo. O relatório financeiro desconta as despesas ao seu ganho para mostrar o resultado real.</Text>

        <Btn label={adding ? "Fechar" : "➕ Registar uma despesa"} onPress={() => setAdding(!adding)} />

        {adding ? (
          <Card>
            <Text style={u.label}>Que despesa?</Text>
            <View style={u.row}>
              {catalog.expenseKinds.map((k) => (
                <Chip key={k.value} label={`${EXPENSE_ICON[k.value] ?? ""} ${k.label}`.trim()} active={newKind === k.value} onPress={() => setNewKind(k.value)} />
              ))}
            </View>
            <Field label="Valor (FCFA)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.,]/g, ""))} keyboardType="numeric" placeholder="Ex: 15000" />
            <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} />
            <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ex: Gasóleo, 20 litros" />
            <PhotoPicker label="Foto do recibo (opcional)" value={receipt} onChange={setReceipt} prefix="expense-" />
            <Btn label={saving ? "A guardar..." : "Guardar a despesa"} onPress={save} disabled={saving} />
          </Card>
        ) : null}

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} emptyLabel="Este mês" />
        {period.from ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Período: {formatDate(period.from)} a {formatDate(period.to)}
          </Text>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["💸 Total gasto", money(summary.total)],
              ["🧾 Despesas", formatNumber(summary.count)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {byKind.length > 0 ? (
          <>
            <SubTitle>Onde gastou</SubTitle>
            <Card>
              <HBars data={byKind.map((k: any) => ({ label: `${EXPENSE_ICON[k.kind] ?? ""} ${labelOf(catalog.expenseKinds, k.kind) || k.kind}`.trim(), value: k.amount }))} color="#C62828" />
            </Card>
          </>
        ) : null}

        <View style={u.row}>
          <Chip label="Todas" active={kind === ""} onPress={() => setKind("")} />
          {catalog.expenseKinds.map((k) => (
            <Chip key={k.value} label={`${EXPENSE_ICON[k.value] ?? ""} ${k.label}`.trim()} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} despesa(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Não há despesas neste período." /> : null}

        {items.map((e) => (
          <Card key={e.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {EXPENSE_ICON[e.kind] ?? "🧾"} {labelOf(catalog.expenseKinds, e.kind) || e.kind}
              </Text>
              <Text style={{ fontWeight: "bold", color: "#C62828" }}>− {money(e.amount)}</Text>
            </View>
            <Text style={u.muted}>{formatDate(e.spentAt)}</Text>
            {e.note ? <Text style={{ marginTop: 2 }}>{e.note}</Text> : null}
            {e.receiptUrl ? (
              <Image source={{ uri: e.receiptUrl }} resizeMode="cover" style={{ width: "100%", height: 110, borderRadius: 8, marginTop: 6, backgroundColor: "#ECEFF1" }} />
            ) : null}
            <View style={u.row}>
              {e.receiptUrl ? <Btn small kind="outline" label="Ver o recibo" onPress={() => Linking.openURL(e.receiptUrl)} /> : null}
              {e.deliveryId ? <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: e.deliveryId })} /> : null}
              <Btn small kind="outline" label="Apagar" onPress={() => remove(e)} />
            </View>
          </Card>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
        <Btn kind="outline" label="📑 Relatório financeiro" onPress={() => navigation.navigate("TrFinanceReport", { from: range.from, to: range.to })} />
      </Page>
    </TrLayout>
  );
}
