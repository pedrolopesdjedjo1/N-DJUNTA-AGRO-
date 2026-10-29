import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import ReportCard from "../components/admin/ReportCard";
import { Page, Title, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoReports } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { REPORT_CATEGORY_ICON, REPORT_TARGET_ICON } from "../constants/backofficeModeration";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

interface Queue {
  key: string;
  label: string;
  assigned?: string;
  category?: string;
  targetType?: string;
  count?: (d: any) => number;
}

// As filas de trabalho da moderação
const QUEUES: Queue[] = [
  { key: "open", label: "Abertas", count: (d) => (d.counts.ABERTA ?? 0) + (d.counts.EM_ANALISE ?? 0) },
  { key: "mine", label: "🙋 As minhas", assigned: "me" },
  { key: "free", label: "Sem responsável", assigned: "none" },
  { key: "fraud", label: "🚫 Fraudes", category: "FRAUDE", count: (d) => d.categoryCounts.FRAUDE ?? 0 },
  { key: "products", label: "🛍️ Produtos denunciados", targetType: "PRODUCT", count: (d) => d.targetCounts.PRODUCT ?? 0 },
  { key: "content", label: "⚠️ Conteúdo inadequado", category: "CONTEUDO_INADEQUADO", count: (d) => d.categoryCounts.CONTEUDO_INADEQUADO ?? 0 },
  { key: "accounts", label: "🕵️ Contas suspeitas", category: "CONTA_SUSPEITA", count: (d) => d.categoryCounts.CONTA_SUSPEITA ?? 0 },
  { key: "complaints", label: "📣 Reclamações", category: "RECLAMACAO", count: (d) => d.categoryCounts.RECLAMACAO ?? 0 },
  { key: "history", label: "📚 Histórico de decisões" },
];

const EMPTY_COUNTS = { counts: {} as Record<string, number>, targetCounts: {} as Record<string, number>, categoryCounts: {} as Record<string, number> };

export default function BoReportsScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();

  const [queue, setQueue] = useState<string>(route?.params?.queue ?? "open");
  const [historyStatus, setHistoryStatus] = useState("RESOLVIDA");
  const [category, setCategory] = useState("");
  const [targetType, setTargetType] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(EMPTY_COUNTS);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.queue) setQueue(route.params.queue);
  }, [route?.params?.queue]);

  const current = QUEUES.find((x) => x.key === queue) ?? QUEUES[0];
  const history = queue === "history";
  const fixedFilter = !!(current.category || current.targetType);

  const key = JSON.stringify({ queue, historyStatus, category, targetType, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoReports({
        status: history ? historyStatus : "",
        assigned: current.assigned,
        category: current.category ?? category,
        targetType: current.targetType ?? targetType,
        q,
        page: nextPage,
      });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setMeta({ counts: r.counts, targetCounts: r.targetCounts, categoryCounts: r.categoryCounts });
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as denúncias."));
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

  const c = meta.counts;
  const open = (c.ABERTA ?? 0) + (c.EM_ANALISE ?? 0);

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>🚩 Denúncias e moderação</Title>
        <Text style={u.muted}>Denúncias de utilizadores, produtos, encomendas e entregas. As mais graves aparecem marcadas.</Text>

        <View style={u.grid}>
          {(
            [
              ["⏳ Por analisar", c.ABERTA ?? 0],
              ["🔍 Em análise", c.EM_ANALISE ?? 0],
              ["✅ Resolvidas", c.RESOLVIDA ?? 0],
              ["🗄️ Arquivadas", c.ARQUIVADA ?? 0],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUEUES.map((x) => {
            const n = x.count ? x.count(meta) : null;
            return (
              <Chip
                key={x.key}
                label={`${x.label}${n !== null ? ` (${x.key === "open" ? open : n})` : ""}`}
                active={queue === x.key}
                onPress={() => {
                  setQueue(x.key);
                  setCategory("");
                  setTargetType("");
                }}
              />
            );
          })}
        </ScrollView>

        {history ? (
          <View style={u.row}>
            <Chip label={`Resolvidas (${c.RESOLVIDA ?? 0})`} active={historyStatus === "RESOLVIDA"} onPress={() => setHistoryStatus("RESOLVIDA")} />
            <Chip label={`Arquivadas (${c.ARQUIVADA ?? 0})`} active={historyStatus === "ARQUIVADA"} onPress={() => setHistoryStatus("ARQUIVADA")} />
            <Chip label="Todas" active={historyStatus === "ALL"} onPress={() => setHistoryStatus("ALL")} />
          </View>
        ) : null}

        <Field
          placeholder="Procurar no texto da denúncia"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {!fixedFilter ? (
          <>
            <ChipGroup
              label="Tipo de problema"
              options={catalog.reportCategories.map((k) => ({ ...k, icon: REPORT_CATEGORY_ICON[k.value] }))}
              value={category}
              onChange={setCategory}
              allowEmpty
              scroll
            />
            <ChipGroup
              label="O que foi denunciado"
              options={catalog.reportTargets.map((k) => ({ ...k, icon: REPORT_TARGET_ICON[k.value] }))}
              value={targetType}
              onChange={setTargetType}
              allowEmpty
              scroll
            />
          </>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} denúncia(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Empty text={history ? "Ainda não há decisões neste estado." : queue === "open" ? "Não há denúncias por analisar. Bom trabalho!" : "Nenhuma denúncia nesta fila."} />
        ) : null}

        {items.map((r) => (
          <ReportCard
            key={r.id}
            item={r}
            categories={catalog.reportCategories}
            statuses={catalog.reportStatus}
            decisions={catalog.reportDecisions}
            onPress={() => navigation.navigate("BoReport", { id: r.id })}
          />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}

        <View style={u.row}>
          <Btn small kind="outline" label="🧾 Registo das decisões" onPress={() => navigation.navigate("BoAudit", { action: "REPORT_DECIDE" })} />
          <Btn small kind="outline" label="⚖️ Disputas de encomendas" onPress={() => navigation.navigate("BoDisputes")} />
        </View>
      </Page>
    </AdminLayout>
  );
}
