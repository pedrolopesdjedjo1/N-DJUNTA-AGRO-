import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoOrgs } from "../api/backoffice";
import { adminCan } from "../utils/adminSession";
import { ORG_STATUS_COLOR, orgStatusLabel } from "../constants/backofficeOrgs";
import { SANCTION_COLOR } from "../constants/backoffice";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

export default function BoOrgsScreen({ navigation, route }: any) {
  const [kind, setKind] = useState<"ONG" | "GOV">(route?.params?.kind === "GOV" ? "GOV" : "ONG");
  const [status, setStatus] = useState("");
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
    if (route?.params?.kind) setKind(route.params.kind === "GOV" ? "GOV" : "ONG");
  }, [route?.params?.kind]);

  const key = JSON.stringify({ kind, status, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoOrgs({ kind, status, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar as organizações."));
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
  const isGov = kind === "GOV";

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>{isGov ? "🏛️ Instituições públicas" : "🌍 ONGs"}</Title>

        <View style={u.row}>
          <Chip label="🌍 ONGs" active={!isGov} onPress={() => { setKind("ONG"); setStatus(""); }} />
          <Chip label="🏛️ Instituições públicas" active={isGov} onPress={() => { setKind("GOV"); setStatus(""); }} />
        </View>

        {adminCan("orgs.manage") ? (
          <View style={u.row}>
            <Btn small kind="outline" label="🆔 Verificar documentos e aprovar" onPress={() => navigation.navigate("NgoAdminVerifications")} />
            {isGov ? <Btn small kind="outline" label="📊 Visão do governo" onPress={() => navigation.navigate("BoGov")} /> : null}
          </View>
        ) : null}
        <Text style={u.muted}>A verificação de documentos e a aprovação fazem-se na tela de verificações. Aqui a equipa acompanha, avisa e suspende o acesso.</Text>

        <View style={u.row}>
          <Chip label={`Todas (${all})`} active={status === ""} onPress={() => setStatus("")} />
          {Object.keys(counts).map((s) => (
            <Chip key={s} label={`${orgStatusLabel(s)} (${counts[s]})`} active={status === s} onPress={() => setStatus(s)} />
          ))}
        </View>

        <Field
          placeholder="Procurar por nome, sigla ou telefone"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} organização(ões)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhuma organização com estes filtros." /> : null}

        {items.map((o) => (
          <TouchableOpacity key={o.userId} activeOpacity={0.85} onPress={() => navigation.navigate("BoOrg", { userId: o.userId })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {isGov ? "🏛️" : "🌍"} {o.name}
                  {o.acronym ? ` (${o.acronym})` : ""} {o.verified ? "✅" : ""}
                </Text>
                <Badge label={orgStatusLabel(o.status)} color={ORG_STATUS_COLOR[o.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>
                {o.ownerName}
                {o.location ? ` · 📍 ${o.location}` : ""}
              </Text>
              {!o.hasProfile ? <Text style={{ color: "#EF6C00" }}>Ainda não preencheu o perfil da organização.</Text> : null}
              <Text style={u.muted}>
                📄 {o.documents} documento(s) · 📋 {o.projects} projeto(s) · 📰 {o.publications} publicação(ões) · 🎯 {o.opportunities} oportunidade(s)
              </Text>
              {o.sanction ? (
                <View style={[u.row, { marginTop: 4 }]}>
                  <Badge label={o.sanction.kind === "BLOQUEIO" ? "Acesso bloqueado" : "Acesso suspenso"} color={SANCTION_COLOR[o.sanction.kind] ?? "#C62828"} />
                </View>
              ) : null}
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
