import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoAudit, listBoSecurityEvents } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { SEVERITY_BO_COLOR } from "../constants/backoffice";
import { auditRoute } from "../constants/backofficeComms";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

type Tab = "audit" | "security";

function metaText(meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  const text = meta.before !== undefined || meta.after !== undefined ? `Antes: ${JSON.stringify(meta.before ?? null)}\nDepois: ${JSON.stringify(meta.after ?? null)}` : JSON.stringify(meta);
  return text.length > 400 ? `${text.slice(0, 400)}...` : text;
}

// Registo de atividades e alertas de segurança
export default function BoAuditScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const adminId: string = route?.params?.adminId ?? "";

  const [tab, setTab] = useState<Tab>("audit");
  const [action, setAction] = useState<string>(route?.params?.action ?? "");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [onlyAlerts, setOnlyAlerts] = useState(true);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [alertsWeek, setAlertsWeek] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.action !== undefined) setAction(route.params.action ?? "");
  }, [route?.params?.action]);

  const key = JSON.stringify({ tab, action, q, range, onlyAlerts, adminId });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      if (tab === "audit") {
        const r = await listBoAudit({ adminId, action, targetType: route?.params?.targetType, targetId: route?.params?.targetId, from: range.from, to: range.to, q, page: nextPage });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setCanSeeAll(r.canSeeAll);
      } else {
        const r = await listBoSecurityEvents({ adminId, severity: onlyAlerts ? "ALERTA" : "", page: nextPage });
        if (mine !== requestId.current) return;
        setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
        setTotal(r.total);
        setAlertsWeek(r.alertsLast7Days);
      }
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar o registo."));
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

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>🧾 Registo de atividades</Title>
        <Text style={u.muted}>
          {canSeeAll || adminId ? "Tudo o que a equipa de administração fez e os alertas de segurança." : "O que fez na administração e os seus alertas de segurança. Quem gere a equipa vê o de todos."}
        </Text>

        {adminId ? (
          <View style={u.row}>
            <Chip label="👤 Só de um administrador ✕" active onPress={() => navigation.setParams({ adminId: undefined })} />
          </View>
        ) : null}

        <View style={u.row}>
          <Chip label="🧾 Atividades" active={tab === "audit"} onPress={() => { setTab("audit"); setItems([]); }} />
          <Chip label="🔐 Segurança" active={tab === "security"} onPress={() => { setTab("security"); setItems([]); }} />
        </View>

        {tab === "audit" ? (
          <>
            <Field placeholder="Procurar no resumo" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />
            <ChipGroup label="Tipo de ação" options={catalog.auditActions} value={action} onChange={setAction} allowEmpty scroll />
            <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} emptyLabel="Tudo" />
          </>
        ) : (
          <>
            <View style={u.grid}>
              <View style={u.tile}>
                <View style={u.tileBox}>
                  <Text style={[u.tileValue, { color: alertsWeek > 0 ? "#EF6C00" : undefined }]}>{formatNumber(alertsWeek)}</Text>
                  <Text style={u.tileLabel}>🚨 Alertas (7 dias)</Text>
                </View>
              </View>
            </View>
            <View style={u.row}>
              <Chip label="Só alertas" active={onlyAlerts} onPress={() => setOnlyAlerts(true)} />
              <Chip label="Todos os eventos" active={!onlyAlerts} onPress={() => setOnlyAlerts(false)} />
            </View>
          </>
        )}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} registo(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nada registado com estes filtros." /> : null}

        {tab === "audit"
          ? items.map((a) => {
              const route2 = auditRoute(a.targetType, a.targetId);
              const meta = metaText(a.meta);
              return (
                <Card key={a.id}>
                  <Text style={u.strong}>{labelOf(catalog.auditActions, a.action) || a.action}</Text>
                  <Text style={{ marginTop: 2, lineHeight: 19 }}>{a.summary}</Text>
                  <Text style={u.muted}>
                    {a.adminName} · {formatDateTime(a.createdAt)}
                  </Text>
                  {openId === a.id && meta ? <Text style={{ marginTop: 4, fontSize: 12, color: "#546E7A" }}>{meta}</Text> : null}
                  <View style={u.row}>
                    {meta ? <Btn small kind="outline" label={openId === a.id ? "Esconder detalhes" : "Detalhes"} onPress={() => setOpenId(openId === a.id ? "" : a.id)} /> : null}
                    {route2 ? <Btn small kind="outline" label="Abrir" onPress={() => navigation.navigate(route2[0], route2[1])} /> : null}
                  </View>
                </Card>
              );
            })
          : items.map((e) => (
              <Card key={e.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.securityEventKinds, e.kind) || e.kind}</Text>
                  <Badge label={e.severity === "ALERTA" ? "Alerta" : "Info"} color={SEVERITY_BO_COLOR[e.severity === "ALERTA" ? "ALERTA" : "INFO"]} />
                </View>
                <Text style={{ marginTop: 2 }}>{e.message}</Text>
                <Text style={u.muted}>
                  {e.adminName ? `${e.adminName} · ` : ""}
                  {e.ip ? `${e.ip} · ` : ""}
                  {formatDateTime(e.createdAt)}
                </Text>
              </Card>
            ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
