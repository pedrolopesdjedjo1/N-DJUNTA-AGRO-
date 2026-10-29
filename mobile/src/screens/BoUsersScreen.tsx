import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import UserRow from "../components/admin/UserRow";
import { Page, Title, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoUsers } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { roleFilterOptions } from "../utils/boRoles";
import { adminCan } from "../utils/adminSession";
import { isDateText } from "../utils/dates";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativas" },
  { value: "SUSPENSO", label: "Suspensas" },
  { value: "BLOQUEADO", label: "Bloqueadas" },
  { value: "INATIVO", label: "Todas as inativas" },
];

const VERIFIED_OPTIONS = [
  { value: "yes", label: "Verificadas" },
  { value: "no", label: "Por verificar" },
];

export default function BoUsersScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();

  const [role, setRole] = useState<string>(route?.params?.role ?? "");
  const [status, setStatus] = useState<string>(route?.params?.status ?? "");
  const [verified, setVerified] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ all: 0, active: 0, inactive: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    setRole(p.role ?? "");
    setStatus(p.status ?? "");
  }, [route?.params]);

  const key = JSON.stringify({ role, status, verified, region, sort, q, range });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoUsers({ role, status, verified, region, sort, q, from: range.from, to: range.to, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os utilizadores."));
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

  function applyDates() {
    if ((fromText.trim() && !isDateText(fromText.trim())) || (toText.trim() && !isDateText(toText.trim()))) {
      Alert.alert("Atenção", "Escreva as datas assim: AAAA-MM-DD (ex: 2026-10-01).");
      return;
    }
    setRange({ from: fromText.trim(), to: toText.trim() });
  }

  function clearFilters() {
    setRole("");
    setStatus("");
    setVerified("");
    setRegion("");
    setSort("");
    setText("");
    setQ("");
    setFromText("");
    setToText("");
    setRange({ from: "", to: "" });
  }

  const hasFilters = !!(role || status || verified || region || sort || q || range.from || range.to);

  return (
    <AdminLayout active="BoUsers">
      <Page>
        <Title>👥 Utilizadores</Title>

        <View style={u.grid}>
          {(
            [
              ["👥 Total", summary.all],
              ["✅ Ativos", summary.active],
              ["⛔ Suspensos ou bloqueados", summary.inactive],
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
          {adminCan("users.manage") ? <Btn small label="➕ Criar utilizador" onPress={() => navigation.navigate("BoUserCreate")} /> : null}
          {adminCan("profiles.view") ? <Btn small kind="outline" label="🏷️ Perfis por tipo" onPress={() => navigation.navigate("BoProfiles")} /> : null}
          {adminCan("users.verify") ? <Btn small kind="outline" label="🆔 Verificações" onPress={() => navigation.navigate("BoIdentity")} /> : null}
        </View>

        <Field
          placeholder="Procurar por nome, telefone ou localidade"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup label="Perfil" options={roleFilterOptions(catalog.roles)} value={role} onChange={setRole} allowEmpty scroll />
        <ChipGroup label="Estado da conta" options={STATUS_OPTIONS} value={status} onChange={setStatus} allowEmpty scroll />

        <View style={u.row}>
          <Chip label={showFilters ? "Menos filtros" : "Mais filtros"} active={showFilters} onPress={() => setShowFilters(!showFilters)} />
          {hasFilters ? <Chip label="Limpar tudo" active={false} onPress={clearFilters} /> : null}
        </View>

        {showFilters ? (
          <>
            <ChipGroup label="Verificação" options={VERIFIED_OPTIONS} value={verified} onChange={setVerified} allowEmpty scroll />
            {regions.length > 0 ? (
              <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
            ) : null}
            <ChipGroup
              label="Ordenar por"
              options={[{ value: "NOME", label: "Nome" }]}
              value={sort}
              onChange={setSort}
              allowEmpty
              emptyLabel="Mais recentes"
              scroll
            />
            <Text style={u.label}>Conta criada entre</Text>
            <View style={u.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Field label="De (AAAA-MM-DD)" value={fromText} onChangeText={setFromText} placeholder="2026-10-01" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Até (AAAA-MM-DD)" value={toText} onChangeText={setToText} placeholder="2026-10-31" />
              </View>
            </View>
            <Btn small kind="outline" label="Aplicar datas" onPress={applyDates} />
          </>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} utilizador(es)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Ninguém com estes filtros." /> : null}

        {items.map((p) => (
          <UserRow
            key={p.id}
            item={p}
            onPress={() => navigation.navigate("BoUser", { id: p.id })}
            extra={<Text style={u.muted}>Conta criada em {formatDate(p.createdAt)}</Text>}
          />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
