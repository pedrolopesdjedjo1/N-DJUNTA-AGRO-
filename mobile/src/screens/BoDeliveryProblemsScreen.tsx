import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, u } from "../components/ui";
import { listBoDeliveryProblems } from "../api/backoffice";
import { useTransportCatalog } from "../utils/transportCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { BO_EVENT_ICON } from "../constants/backofficeTransport";
import { PROBLEM_ICON } from "../constants/transporter";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

// Problemas comunicados pelos transportadores (e entregas que foram devolvidas)
export default function BoDeliveryProblemsScreen({ navigation }: any) {
  const tcatalog = useTransportCatalog();
  const [status, setStatus] = useState("open");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({ open: 0, handled: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoDeliveryProblems({ status, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os problemas."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status])
  );

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>⚠️ Problemas de entrega</Title>
        <Text style={u.muted}>Problemas comunicados e entregas devolvidas nos últimos 60 dias. Um problema fica tratado quando a equipa regista o que fez.</Text>

        <View style={u.row}>
          <Chip label={`Por tratar (${counts.open})`} active={status === "open"} onPress={() => setStatus("open")} />
          <Chip label={`Tratados (${counts.handled})`} active={status === "handled"} onPress={() => setStatus("handled")} />
          <Chip label="Todos" active={status === "all"} onPress={() => setStatus("all")} />
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} registo(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={status === "open" ? "Não há problemas por tratar. Tudo em ordem." : "Nada nesta lista."} /> : null}

        {items.map((p) => (
          <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoDelivery", { id: p.deliveryId })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {BO_EVENT_ICON[p.kind] ?? "⚠️"} {p.kind === "DESISTIU" ? "Entrega devolvida" : labelOf(tcatalog.problemKinds, p.category) || "Problema"} · {p.orderCode}
                </Text>
                <Badge label={p.handled ? "Tratado" : "Por tratar"} color={p.handled ? "#2E7D32" : "#EF6C00"} />
              </View>
              {p.category ? (
                <Text style={u.muted}>
                  {PROBLEM_ICON[p.category] ?? ""} {labelOf(tcatalog.problemKinds, p.category) || labelOf(tcatalog.releaseReasons, p.category) || p.category}
                </Text>
              ) : null}
              {p.message ? (
                <Text style={{ marginTop: 4, lineHeight: 20 }} numberOfLines={3}>
                  {p.message}
                </Text>
              ) : null}
              <Text style={u.muted}>
                {p.transporter ? `🚛 ${p.transporter.name}` : ""} · {formatDateTime(p.createdAt)}
              </Text>
              <View style={u.row}>
                <Btn small label={p.handled ? "Ver a entrega" : "Tratar"} onPress={() => navigation.navigate("BoDelivery", { id: p.deliveryId })} />
                {p.transporter?.phone ? <Btn small kind="outline" label="📞 Ligar ao transportador" onPress={() => Linking.openURL(`tel:${p.transporter.phone}`)} /> : null}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
