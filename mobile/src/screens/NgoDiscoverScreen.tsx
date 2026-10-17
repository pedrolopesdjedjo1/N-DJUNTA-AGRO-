import React, { useCallback, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { discoverPeople } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { ROLE_LABEL, ROLE_SECTOR } from "../utils/roles";
import { getApiErrorMessage } from "../api/errorMessage";

const KINDS: [string, string][] = [
  ["AGRICULTORES", "🌾 Agricultores"],
  ["PESCADORES", "🎣 Pescadores"],
  ["ARTESAOS", "🧺 Artesãos"],
  ["COOPERATIVAS", "🤝 Cooperativas"],
  ["ONGS", "🌍 Organizações"],
];

export default function NgoDiscoverScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const projectId: string | undefined = route?.params?.projectId || undefined;
  const communityId: string | undefined = route?.params?.communityId || undefined;

  const [kind, setKind] = useState("AGRICULTORES");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regionText, setRegionText] = useState("");
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState<string[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const key = JSON.stringify({ kind, q, region });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const result = await discoverPeople({ kind, q, region, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
      setTotal(result.total);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) {
        setError(getApiErrorMessage(e, "Não foi possível procurar."));
      }
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      if (regions.length === 0) {
        getWeatherRegions()
          .then(setRegions)
          .catch(() => {});
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  function applyRegion(value: string) {
    setRegionText(value);
    setRegion(value.trim());
  }

  function registerPerson(p: any) {
    navigation.navigate("NgoBeneficiaryForm", {
      userId: p.id,
      name: p.name,
      sector: ROLE_SECTOR[p.role] ?? "OUTRO",
      region: p.location ?? undefined,
      projectId,
      communityId,
    });
  }

  function registerCooperative(c: any) {
    navigation.navigate("NgoBeneficiaryForm", {
      name: c.name,
      sector: "COOPERATIVA",
      region: c.region ?? undefined,
      projectId,
      communityId,
    });
  }

  return (
    <Page>
      <Title>🔎 Procurar no app</Title>
      <Text style={u.muted}>
        Encontre agricultores, pescadores, artesãos, cooperativas e organizações. Por privacidade não mostramos telefones: contacte pelas mensagens do app.
      </Text>

      <View style={[u.row, { marginTop: 8 }]}>
        {KINDS.map(([value, label]) => (
          <Chip key={value} label={label} active={kind === value} onPress={() => setKind(value)} />
        ))}
      </View>

      <Field
        placeholder="Procurar por nome"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />
      <Field
        placeholder="Região (ex: Bafatá)"
        value={regionText}
        onChangeText={setRegionText}
        onSubmitEditing={() => setRegion(regionText.trim())}
        returnKeyType="search"
      />
      {regions.length > 0 ? (
        <View style={u.row}>
          <Chip label="Todas as regiões" active={region === ""} onPress={() => applyRegion("")} />
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => applyRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A procurar..." : `${total} resultado(s)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? <Empty text="Nenhum resultado. Tente outra região ou outro nome." /> : null}

      {kind === "COOPERATIVAS"
        ? items.map((c) => (
            <Card key={c.id}>
              <Text style={u.strong}>{c.name}</Text>
              {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
              <Text style={u.muted}>👥 {c.members} membro(s) · Líder: {c.leader?.name}</Text>
              {c.description ? <Text style={{ marginTop: 4 }}>{c.description}</Text> : null}
              <View style={u.row}>
                {c.leader ? (
                  <Btn small kind="outline" label="💬 Contactar líder" onPress={() => navigation.navigate("Chat", { userId: c.leader.id, userName: c.leader.name })} />
                ) : null}
                <Btn small label="➕ Registar como beneficiária" onPress={() => registerCooperative(c)} />
              </View>
            </Card>
          ))
        : kind === "ONGS"
        ? items.map((o) => (
            <Card key={o.ownerId}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {o.name}
                  {o.acronym ? ` (${o.acronym})` : ""}
                </Text>
                {o.isVerified ? <Badge label="Verificada ✅" color="#2E7D32" /> : null}
              </View>
              {o.region ? <Text style={u.muted}>📍 {o.region}</Text> : null}
              {o.areas?.length > 0 ? (
                <Text style={u.muted}>{o.areas.map((a: string) => labelOf(catalog.areas, a)).join(", ")}</Text>
              ) : null}
              <Text style={u.muted}>📋 {o.projectsCount} projeto(s) público(s)</Text>
              <View style={u.row}>
                <Btn small label="Ver organização" onPress={() => navigation.navigate("NgoPublicOrganization", { id: o.ownerId })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: o.ownerId, userName: o.name })} />
                <Btn
                  small
                  kind="outline"
                  label="🤝 Juntar aos parceiros"
                  onPress={() => navigation.navigate("NgoPartnerForm", { linkedUserId: o.ownerId, name: o.name, type: "ONG", region: o.region ?? undefined })}
                />
              </View>
            </Card>
          ))
        : items.map((p) => (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {p.name} {p.isVerified ? "✅" : ""}
                </Text>
                {p.alreadyBeneficiary ? <Badge label="Já registado" color="#1565C0" /> : null}
              </View>
              <Text style={u.muted}>{ROLE_LABEL[p.role] ?? p.role}</Text>
              {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
              <Text style={u.muted}>📦 {p.productsCount} produto(s) à venda</Text>
              <View style={u.row}>
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} />
                <Btn small label={p.alreadyBeneficiary ? "➕ Registar noutro projeto" : "➕ Registar como beneficiário"} onPress={() => registerPerson(p)} />
              </View>
            </Card>
          ))}

      {items.length < total ? (
        <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} />
      ) : null}
    </Page>
  );
}
