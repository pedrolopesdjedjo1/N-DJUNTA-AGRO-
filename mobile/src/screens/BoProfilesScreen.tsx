import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import UserRow from "../components/admin/UserRow";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getBoProfilesSummary, listBoProfiles } from "../api/backoffice";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { stars } from "../constants/transporter";

// Os perfis por tipo: agricultores, pescadores, artesãos, transportadores, clientes, ONGs, governo, empresas e cooperativas
export default function BoProfilesScreen({ navigation, route }: any) {
  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const summary = useLoader(getBoProfilesSummary, [] as any[]);

  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cooperatives, setCooperatives] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (route?.params?.kind !== undefined) setKind(route.params.kind ?? "");
  }, [route?.params?.kind]);

  async function load(reset: boolean) {
    if (!kind) return;
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoProfiles(kind, { q, verified, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCooperatives(!!r.cooperatives);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os perfis."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (kind) load(true);
      else summary.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, q, verified])
  );

  const current = (summary.data as any[]).find((s) => s.value === kind);

  if (!kind) {
    return (
      <AdminLayout active="BoUsers">
        <Page loader={summary}>
          <Title>🏷️ Perfis por tipo</Title>
          <Text style={u.muted}>Escolha um tipo para ver todas as pessoas e organizações desse perfil.</Text>

          <View style={u.grid}>
            {(summary.data as any[]).map((s) => (
              <TouchableOpacity key={s.value} style={u.tile} onPress={() => { setKind(s.value); setItems([]); setQ(""); setText(""); setVerified(""); }}>
                <View style={u.tileBox}>
                  <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                  <Text style={[u.tileValue, { fontSize: 16 }]}>{formatNumber(s.total)}</Text>
                  <Text style={u.tileLabel}>{s.label}</Text>
                  {s.value !== "COOPERATIVAS" ? <Text style={u.muted}>{formatNumber(s.verified)} verificado(s)</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Page>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="BoUsers">
      <Page>
        <Title>
          {current?.icon} {current?.label ?? "Perfis"}
        </Title>
        <View style={u.row}>
          <Btn small kind="outline" label="⬅️ Todos os tipos" onPress={() => { setKind(""); setItems([]); }} />
          <Btn small kind="outline" label="👥 Todos os utilizadores" onPress={() => navigation.navigate("BoUsers")} />
        </View>

        <Field
          placeholder="Procurar por nome ou localidade"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {!cooperatives && kind !== "COOPERATIVAS" ? (
          <View style={u.row}>
            <Chip label="Todos" active={verified === ""} onPress={() => setVerified("")} />
            <Chip label="Verificados" active={verified === "yes"} onPress={() => setVerified("yes")} />
            <Chip label="Por verificar" active={verified === "no"} onPress={() => setVerified("no")} />
          </View>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} resultado(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nada encontrado." /> : null}

        {cooperatives
          ? items.map((c) => (
              <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoCoop", { id: c.id })}>
                <Card>
                  <Text style={u.strong}>🤲 {c.name}</Text>
                  {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
                  <Text style={u.muted}>👥 {c.members} membro(s)</Text>
                </Card>
              </TouchableOpacity>
            ))
          : items.map((p) => (
              <UserRow
                key={p.id}
                item={p}
                onPress={() => navigation.navigate("BoUser", { id: p.id })}
                extra={
                  <View style={[u.row, { marginTop: 4 }]}>
                    <Badge label={`🛍️ ${p.products}`} color="#2E7D32" />
                    <View style={{ marginLeft: 6 }}>
                      <Badge label={`📦 ${p.orders}`} color="#1565C0" />
                    </View>
                    {p.rating?.average ? (
                      <View style={{ marginLeft: 6 }}>
                        <Badge label={`${stars(1)} ${p.rating.average}`} color="#F9A825" />
                      </View>
                    ) : null}
                    {p.delivered > 0 ? (
                      <View style={{ marginLeft: 6 }}>
                        <Badge label={`🚚 ${p.delivered}`} color="#EF6C00" />
                      </View>
                    ) : null}
                    {p.organization ? (
                      <View style={{ marginLeft: 6 }}>
                        <Badge label={p.organization.isVerified ? `${p.organization.name} ✅` : p.organization.name} color="#6A1B9A" />
                      </View>
                    ) : null}
                  </View>
                }
              />
            ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
