import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listTrContacts, logTrContact, getTrDirectory, getTrPartyReputation } from "../api/transporterV2";
import { getGovRegions } from "../api/gov";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { DIRECTORY_ROLE_ICON, RELATION_TEXT } from "../constants/transporterSocial";
import { trStars } from "../constants/transporterV2";
import { whatsappUrl } from "../utils/links";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

type Tab = "people" | "directory";

export default function TrContactsScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const [tab, setTab] = useState<Tab>("people");

  // Pessoas com quem trabalhou
  const [relation, setRelation] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [peopleBusy, setPeopleBusy] = useState(true);

  // Procurar pessoas
  const [dKind, setDKind] = useState("AGRICULTORES");
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [dText, setDText] = useState("");
  const [dQ, setDQ] = useState("");
  const [dItems, setDItems] = useState<any[]>([]);
  const [dTotal, setDTotal] = useState(0);
  const [dPage, setDPage] = useState(1);
  const [dNote, setDNote] = useState("");
  const [dBusy, setDBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  async function loadPeople() {
    setPeopleBusy(true);
    setError("");
    try {
      const r = await listTrContacts({ kind: relation, q });
      setPeople(r.items);
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar os contactos."));
    } finally {
      setPeopleBusy(false);
    }
  }

  async function loadDirectory(reset: boolean) {
    const next = reset ? 1 : dPage + 1;
    const mine = ++requestId.current;
    setDBusy(true);
    setError("");
    try {
      const r = await getTrDirectory({ kind: dKind, region, q: dQ, page: next });
      if (mine !== requestId.current) return;
      setDItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setDTotal(r.total);
      setDNote(r.note);
      setDPage(next);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível procurar."));
    } finally {
      if (mine === requestId.current) setDBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (tab === "people") loadPeople();
      else loadDirectory(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, relation, q, dKind, region, dQ])
  );

  function contact(p: any, via: "CHAMADA" | "WHATSAPP" | "MENSAGEM") {
    logTrContact({ targetId: p.id, via }).catch(() => {});
    if (via === "CHAMADA") Linking.openURL(`tel:${p.phone}`);
    else if (via === "WHATSAPP") Linking.openURL(whatsappUrl(p.phone) as string);
    else navigation.navigate("Chat", { userId: p.id, userName: p.name });
  }

  async function reputation(p: any) {
    try {
      const r = await getTrPartyReputation(p.id);
      Alert.alert(
        p.name,
        r.count === 0
          ? "Ainda sem avaliações de transportadores."
          : `${trStars(r.average)} ${r.average} (${r.count} avaliação(ões) de transportadores)${r.comments.length ? `\n\n${r.comments.map((c: any) => `"${c.comment}"`).join("\n")}` : ""}`
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível ver a reputação."));
    }
  }

  function personRow(p: any, directory: boolean) {
    const wa = whatsappUrl(p.phone);
    return (
      <Card key={p.id}>
        <View style={[u.row, { alignItems: "center" }]}>
          {p.photoUrl ? (
            <Image source={{ uri: p.photoUrl }} style={[u.photo, { width: 44, height: 44, borderRadius: 22 }]} />
          ) : (
            <View style={[u.photo, { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 20 }}>{directory ? DIRECTORY_ROLE_ICON[p.role] ?? "👤" : "👤"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={u.strong} numberOfLines={1}>
              {p.name} {p.isVerified ? "✅" : ""}
            </Text>
            {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
          </View>
        </View>

        {!directory ? (
          <>
            <View style={[u.row, { marginTop: 4 }]}>
              {(p.relations as string[]).map((r) => (
                <Badge key={r} label={RELATION_TEXT[r] ?? r} color={r === "BUYER" ? "#1565C0" : "#2E7D32"} />
              ))}
            </View>
            <Text style={u.muted}>
              🚚 {p.deliveries} entrega(s){p.lastDeliveryAt ? ` · a última em ${formatDate(p.lastDeliveryAt)}` : ""}
            </Text>
            <Text style={u.muted}>
              📇 {p.contacts} contacto(s){p.lastContactAt ? ` · o último em ${formatDate(p.lastContactAt)}` : ""}
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => contact(p, "MENSAGEM")} />
              {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => contact(p, "CHAMADA")} /> : null}
              {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => contact(p, "WHATSAPP")} /> : null}
            </View>
            <View style={u.row}>
              <Btn small kind="outline" label="📚 Histórico" onPress={() => navigation.navigate("TrContactHistory", { userId: p.id })} />
              <Btn small kind="outline" label="⭐ Reputação" onPress={() => reputation(p)} />
            </View>
          </>
        ) : (
          <>
            {p.products !== null && p.products !== undefined ? <Text style={u.muted}>🛍️ {p.products} produto(s) à venda</Text> : null}
            {p.agent ? (
              <Text style={u.muted}>
                {p.agent.regions?.length ? `Regiões: ${p.agent.regions.join(", ")}` : ""}
              </Text>
            ) : null}
            <Btn small kind="outline" label="💬 Enviar mensagem" onPress={() => navigation.navigate("Chat", { userId: p.id, userName: p.name })} />
          </>
        )}
      </Card>
    );
  }

  return (
    <TrLayout active="TrProfile">
      <Page>
        <Title>👥 Clientes e contactos</Title>

        <View style={u.row}>
          <Chip label="Pessoas com quem trabalhei" active={tab === "people"} onPress={() => setTab("people")} />
          <Chip label="Procurar pessoas" active={tab === "directory"} onPress={() => setTab("directory")} />
        </View>

        {error ? <Empty text={error} /> : null}

        {tab === "people" ? (
          <>
            <Text style={u.muted}>Os compradores e vendedores das suas entregas, com o histórico de chamadas e mensagens.</Text>
            <Field placeholder="Procurar por nome ou localidade" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />
            <View style={u.row}>
              <Chip label="Todos" active={relation === ""} onPress={() => setRelation("")} />
              <Chip label="🛒 Compradores" active={relation === "BUYER"} onPress={() => setRelation("BUYER")} />
              <Chip label="🏪 Vendedores" active={relation === "SELLER"} onPress={() => setRelation("SELLER")} />
            </View>
            <Text style={[u.muted, { marginTop: 8 }]}>{peopleBusy && people.length === 0 ? "A carregar..." : `${formatNumber(people.length)} pessoa(s)`}</Text>
            {!peopleBusy && !error && people.length === 0 ? <Empty text="Ainda não trabalhou com ninguém. Depois da sua primeira entrega, as pessoas aparecem aqui." /> : null}
            {people.map((p) => personRow(p, false))}
          </>
        ) : (
          <>
            <Text style={u.muted}>Procure agricultores, pescadores, artesãos, comerciantes, compradores e agentes. Por privacidade, o contacto faz-se pelas mensagens do app.</Text>
            <ChipGroup label="Quem procura" options={catalog.directoryKinds.map((k: any) => ({ value: k.value, label: `${k.icon} ${k.label}` }))} value={dKind} onChange={setDKind} scroll />
            {regions.length > 0 ? <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll /> : null}
            <Field placeholder="Procurar por nome ou localidade" value={dText} onChangeText={setDText} onSubmitEditing={() => setDQ(dText.trim())} returnKeyType="search" />
            <Text style={[u.muted, { marginTop: 8 }]}>{dBusy && dItems.length === 0 ? "A carregar..." : `${formatNumber(dTotal)} resultado(s)`}</Text>
            {!dBusy && !error && dItems.length === 0 ? <Empty text="Ninguém encontrado." /> : null}
            {dItems.map((p) => personRow(p, true))}
            {dItems.length < dTotal ? <Btn kind="outline" label={dBusy ? "A carregar..." : "Ver mais"} onPress={() => loadDirectory(false)} disabled={dBusy} /> : null}
            {dNote ? <Text style={u.muted}>{dNote}</Text> : null}
          </>
        )}
      </Page>
    </TrLayout>
  );
}
