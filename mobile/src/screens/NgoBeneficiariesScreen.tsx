import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBeneficiaries, deleteBeneficiary, listNgoProjects, listCommunities } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { ageFrom } from "../utils/roles";
import { getApiErrorMessage } from "../api/errorMessage";

const PAGE = 30;

export default function NgoBeneficiariesScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const params = route?.params ?? {};

  const [sector, setSector] = useState<string>(params.sector ?? "");
  const [gender, setGender] = useState<string>(params.gender ?? "");
  const [youth, setYouth] = useState<boolean>(!!params.youth);
  const [linked, setLinked] = useState(false);
  const [projectId, setProjectId] = useState<string>(params.projectId ?? "");
  const [communityId, setCommunityId] = useState<string>(params.communityId ?? "");
  const [projectName, setProjectName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  // Quando chega de outra tela com filtros (projeto, comunidade, sector...), aplica-os
  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    setProjectId(p.projectId ?? "");
    setCommunityId(p.communityId ?? "");
    setSector(p.sector ?? "");
    setGender(p.gender ?? "");
    setYouth(!!p.youth);
  }, [route?.params]);

  useEffect(() => {
    setProjectName("");
    setCommunityName("");
    if (projectId) {
      listNgoProjects()
        .then((r: any) => setProjectName(r.projects.find((p: any) => p.id === projectId)?.name ?? ""))
        .catch(() => {});
    }
    if (communityId) {
      listCommunities()
        .then((r: any) => setCommunityName((r as any[]).find((c) => c.id === communityId)?.name ?? ""))
        .catch(() => {});
    }
  }, [projectId, communityId]);

  const key = JSON.stringify({ q, sector, gender, youth, linked, projectId, communityId });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const result = await listBeneficiaries({
        projectId,
        communityId,
        sector,
        gender,
        youth,
        linked,
        q,
        page: nextPage,
        limit: PAGE,
      });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? result.items : [...prev, ...result.items]));
      setTotal(result.total);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) {
        setError(getApiErrorMessage(e, "Não foi possível carregar os beneficiários."));
      }
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

  function remove(b: any) {
    Alert.alert("Apagar beneficiário", `Apagar "${b.name}" dos registos?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBeneficiary(b.id);
            load(true);
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  function clearFilters() {
    setSector("");
    setGender("");
    setYouth(false);
    setLinked(false);
    setProjectId("");
    setCommunityId("");
    setText("");
    setQ("");
  }

  const activeFilters =
    (sector ? 1 : 0) + (gender ? 1 : 0) + (youth ? 1 : 0) + (linked ? 1 : 0) + (projectId ? 1 : 0) + (communityId ? 1 : 0) + (q ? 1 : 0);

  return (
    <Page>
      <Title>👥 Beneficiários</Title>

      <Btn label="➕ Registar beneficiário" onPress={() => navigation.navigate("NgoBeneficiaryForm", { projectId, communityId })} />
      <View style={u.row}>
        <Btn small kind="outline" label="🔎 Procurar pessoas no app" onPress={() => navigation.navigate("NgoDiscover", { projectId, communityId })} />
        {activeFilters > 0 ? <Btn small kind="outline" label="Limpar filtros" onPress={clearFilters} /> : null}
      </View>

      {projectId ? (
        <Text style={[u.muted, { marginTop: 8 }]}>📋 Projeto: {projectName || "este projeto"}</Text>
      ) : null}
      {communityId ? (
        <Text style={u.muted}>🏘️ Comunidade: {communityName || "esta comunidade"}</Text>
      ) : null}

      <Field
        placeholder="Procurar por nome ou telefone"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup label="Tipo de beneficiário" options={catalog.sectors} value={sector} onChange={setSector} allowEmpty scroll />
      <ChipGroup label="Género" options={catalog.genders} value={gender} onChange={setGender} allowEmpty />

      <View style={u.row}>
        <Chip label="🧑 Jovens (15 a 35 anos)" active={youth} onPress={() => setYouth(!youth)} />
        <Chip label="✅ Com conta no app" active={linked} onPress={() => setLinked(!linked)} />
      </View>

      <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${total} registo(s)`}</Text>

      {error ? <Empty text={error} /> : null}
      {!busy && !error && items.length === 0 ? (
        <Empty text={activeFilters > 0 ? "Nenhum beneficiário com estes filtros." : "Ainda não registou beneficiários."} />
      ) : null}

      {items.map((b) => {
        const age = ageFrom(b.birthYear);
        return (
          <Card key={b.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{b.name}</Text>
              {b.userId ? <Badge label="Tem conta ✅" color="#2E7D32" /> : null}
            </View>

            <Text style={u.muted}>
              {labelOf(catalog.sectors, b.sector)}
              {b.gender ? ` · ${labelOf(catalog.genders, b.gender)}` : ""}
              {age !== null ? ` · ${age} anos` : ""}
              {b.isYouth ? " · Jovem" : ""}
            </Text>
            {b.communityName ? <Text style={u.muted}>🏘️ {b.communityName}</Text> : b.region ? <Text style={u.muted}>📍 {b.region}</Text> : null}
            {b.projectName ? <Text style={u.muted}>📋 {b.projectName}</Text> : null}
            {b.supportGiven ? <Text style={{ marginTop: 4 }}>Apoio: {b.supportGiven}</Text> : null}
            {b.notes ? <Text style={u.muted}>📝 {b.notes}</Text> : null}

            <View style={u.row}>
              <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoBeneficiaryForm", { beneficiary: b })} />
              {b.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${b.phone}`)} /> : null}
              {b.userId ? (
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: b.userId, userName: b.name })} />
              ) : null}
              <Btn small kind="danger" label="Apagar" onPress={() => remove(b)} />
            </View>
          </Card>
        );
      })}

      {items.length < total ? (
        <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} />
      ) : null}
    </Page>
  );
}
