import React, { useCallback, useRef, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoFlags, reviewBoFlag } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { FLAG_ICON, FLAG_LEVEL_COLOR } from "../constants/backofficeFinance";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

// Alertas automáticos de transações suspeitas (últimos 30 dias)
export default function BoFlagsScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const canManage = adminCan("finance.manage");

  const [rule, setRule] = useState("");
  const [showReviewed, setShowReviewed] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ counts: {} as Record<string, number>, open: 0, high: 0, note: "" });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [reviewKey, setReviewKey] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoFlags({ rule, showReviewed, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setMeta({ counts: r.counts, open: r.open, high: r.high, note: r.note });
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os alertas."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rule, showReviewed])
  );

  async function review() {
    if (note.trim().length < 3) {
      Alert.alert("Atenção", "Explique o que concluiu. Fica no registo.");
      return;
    }

    setSaving(true);
    try {
      await reviewBoFlag(reviewKey, note.trim());
      setReviewKey("");
      setNote("");
      load(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a revisão."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="BoFinance">
      <Page>
        <Title>🚨 Transações suspeitas</Title>
        <Text style={u.muted}>Alertas automáticos sobre os últimos 30 dias. Um alerta não é uma prova: é um pedido para a equipa ver o caso.</Text>

        <View style={u.grid}>
          {(
            [
              ["🚨 Por rever", meta.open],
              ["🔴 Gravidade alta", meta.high],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { color: label.includes("alta") && value > 0 ? "#C62828" : undefined }]}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={`Todos (${meta.open})`} active={rule === ""} onPress={() => setRule("")} />
          {catalog.flagRules.map((r) => (
            <Chip key={r.value} label={`${FLAG_ICON[r.value] ?? ""} ${r.label} (${meta.counts[r.value] ?? 0})`.trim()} active={rule === r.value} onPress={() => setRule(r.value)} />
          ))}
        </ScrollView>
        <View style={u.row}>
          <Chip label={showReviewed ? "Mostrar também os já revistos ✓" : "Mostrar também os já revistos"} active={showReviewed} onPress={() => setShowReviewed(!showReviewed)} />
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} alerta(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhum alerta por rever. Tudo em ordem." /> : null}

        {items.map((f) => (
          <Card key={f.key}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {FLAG_ICON[f.rule] ?? "🚨"} {f.title}
              </Text>
              {f.reviewed ? <Badge label="Revisto" color="#757575" /> : <Badge label={f.level === "ALTA" ? "Alta" : "Média"} color={FLAG_LEVEL_COLOR[f.level] ?? "#EF6C00"} />}
            </View>
            <Text style={[u.muted, { marginTop: 2 }]}>{labelOf(catalog.flagRules, f.rule)}</Text>
            <Text style={{ marginTop: 4, lineHeight: 20 }}>{f.detail}</Text>
            <Text style={u.muted}>
              {f.amount ? `${money(f.amount)} · ` : ""}
              {formatDate(f.at)}
            </Text>

            <View style={u.row}>
              {f.orderId ? <Btn small kind="outline" label="Abrir a encomenda" onPress={() => navigation.navigate("BoOrder", { id: f.orderId })} /> : null}
              {f.userId ? <Btn small kind="outline" label="Ver a pessoa" onPress={() => navigation.navigate("BoUser", { id: f.userId })} /> : null}
              {canManage && !f.reviewed ? <Btn small label={reviewKey === f.key ? "Fechar" : "✅ Marcar como revisto"} onPress={() => { setReviewKey(reviewKey === f.key ? "" : f.key); setNote(""); }} /> : null}
            </View>

            {reviewKey === f.key ? (
              <View style={{ marginTop: 8 }}>
                <Field label="O que concluiu (fica no registo)" value={note} onChangeText={setNote} multiline placeholder="Ex: Confirmei com o vendedor. É uma compra legítima de uma cooperativa." />
                <Btn label={saving ? "A guardar..." : "Guardar revisão"} onPress={review} disabled={saving} />
              </View>
            ) : null}
          </Card>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
        {meta.note ? <Text style={[u.muted, { marginTop: 10 }]}>{meta.note}</Text> : null}
        <Text style={u.muted}>O limite de valor a partir do qual uma encomenda é revista muda-se nas configurações.</Text>
      </Page>
    </AdminLayout>
  );
}
