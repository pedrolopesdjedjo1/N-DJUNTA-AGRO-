import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoCoops } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { COOP_STATUS_COLOR } from "../constants/backofficeOrgs";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

export default function BoCoopsScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();

  const [status, setStatus] = useState<string>(route?.params?.status ?? "");
  const [region, setRegion] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [members, setMembers] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  const key = JSON.stringify({ status, region, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoCoops({ status, region, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setMembers(r.totalMembers);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as cooperativas."));
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
    <AdminLayout active="BoSystem">
      <Page>
        <Title>🤲 Cooperativas</Title>
        <Text style={u.muted}>As cooperativas que já existiam aparecem como "por analisar" até a equipa decidir.</Text>

        <View style={u.grid}>
          {(
            [
              ["🤲 Cooperativas", all],
              ["⏳ Por analisar", counts.SEM_ANALISE ?? 0],
              ["👥 Membros no total", members],
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

        <View style={u.row}>
          <Chip label={`Todas (${all})`} active={status === ""} onPress={() => setStatus("")} />
          {catalog.coopStatus.map((s) => (
            <Chip key={s.value} label={`${s.label} (${counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </View>

        <Field
          placeholder="Procurar por nome, região ou líder"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
        {regions.length > 0 ? (
          <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} cooperativa(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhuma cooperativa com estes filtros." /> : null}

        {items.map((c) => (
          <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoCoop", { id: c.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🤲 {c.name}</Text>
                <Badge label={labelOf(catalog.coopStatus, c.status) || c.status} color={COOP_STATUS_COLOR[c.status] ?? "#757575"} />
              </View>
              {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
              <Text style={u.muted}>
                👥 {c.members} membro(s){c.leader ? ` · líder: ${c.leader.name}` : " · sem líder"}
              </Text>
              {c.note ? <Text style={[u.muted, { marginTop: 2 }]}>📝 {c.note}</Text> : null}
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
