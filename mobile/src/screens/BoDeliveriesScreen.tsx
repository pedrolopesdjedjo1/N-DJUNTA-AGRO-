import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import BoDeliveryCard from "../components/admin/BoDeliveryCard";
import { Page, Title, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoDeliveries, getBoUser } from "../api/backoffice";
import { useTransportCatalog } from "../utils/transportCatalog";
import { PHASE_ICON } from "../constants/transporter";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

export default function BoDeliveriesScreen({ navigation, route }: any) {
  const tcatalog = useTransportCatalog();

  const [phase, setPhase] = useState<string>(route?.params?.phase ?? "");
  const [transporterId, setTransporterId] = useState<string>(route?.params?.transporterId ?? "");
  const [transporterName, setTransporterName] = useState("");
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.phase !== undefined) setPhase(p.phase ?? "");
    if (p.transporterId !== undefined) setTransporterId(p.transporterId ?? "");
  }, [route?.params]);

  useEffect(() => {
    setTransporterName("");
    if (transporterId) {
      getBoUser(transporterId)
        .then((r: any) => setTransporterName(r.user?.name ?? ""))
        .catch(() => {});
    }
  }, [transporterId]);

  const key = JSON.stringify({ phase, transporterId, problemsOnly, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoDeliveries({ phase, transporterId, problems: problemsOnly, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as entregas."));
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

  const all = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>📦 Entregas</Title>

        {transporterId ? (
          <View style={u.row}>
            <Chip
              label={`🚛 Só de ${transporterName || "um transportador"} ✕`}
              active
              onPress={() => {
                setTransporterId("");
                navigation.setParams({ transporterId: undefined });
              }}
            />
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={`Todas (${formatNumber(all)})`} active={phase === ""} onPress={() => setPhase("")} />
          {tcatalog.deliveryPhases.map((p) => (
            <Chip key={p.value} label={`${PHASE_ICON[p.value] ?? ""} ${p.label} (${formatNumber(counts[p.value] ?? 0)})`.trim()} active={phase === p.value} onPress={() => setPhase(p.value)} />
          ))}
        </ScrollView>

        <Field
          placeholder="Procurar por número da encomenda ou transportador"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
        <View style={u.row}>
          <Chip label="⚠️ Só com problemas (30 dias)" active={problemsOnly} onPress={() => setProblemsOnly(!problemsOnly)} />
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} entrega(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhuma entrega com estes filtros." /> : null}

        {items.map((c) => (
          <BoDeliveryCard key={c.id} item={c} phases={tcatalog.deliveryPhases} onPress={() => navigation.navigate("BoDelivery", { id: c.id })} />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
