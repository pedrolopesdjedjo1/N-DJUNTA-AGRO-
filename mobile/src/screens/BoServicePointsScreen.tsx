import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoServicePoints, reviewBoServicePoint, deleteBoServicePoint } from "../api/backofficeTransport";
import { getGovRegions } from "../api/gov";
import { useBoTransportCatalog } from "../utils/boTransportCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { SERVICE_ICON, SERVICE_STATUS_COLOR } from "../constants/transporterTools";
import { pointUrl } from "../utils/trMaps";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

export default function BoServicePointsScreen({ navigation, route }: any) {
  const catalog = useBoTransportCatalog();
  const canManage = adminCan("transport.manage");

  const [status, setStatus] = useState<string>(route?.params?.status ?? "PENDENTE");
  const [kind, setKind] = useState("");
  const [region, setRegion] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [reviewId, setReviewId] = useState("");
  const [decision, setDecision] = useState<"PUBLICAR" | "ESCONDER">("PUBLICAR");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route?.params?.status !== undefined) setStatus(route.params.status ?? "");
  }, [route?.params?.status]);

  const key = JSON.stringify({ status, kind, region, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoServicePoints({ status, kind, region, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setCounts(r.counts);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os locais."));
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

  function openReview(id: string, next: "PUBLICAR" | "ESCONDER") {
    if (reviewId === id && decision === next) {
      setReviewId("");
      return;
    }
    setReviewId(id);
    setDecision(next);
    setNote("");
  }

  async function submitReview(p: any) {
    if (decision === "ESCONDER" && note.trim().length < 3) {
      Alert.alert("Atenção", "Explique porque o local é escondido. Quem o sugeriu vê.");
      return;
    }

    setSaving(true);
    try {
      await reviewBoServicePoint(p.id, { decision, note: note.trim() || undefined });
      setReviewId("");
      load(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a decisão."));
    } finally {
      setSaving(false);
    }
  }

  function remove(p: any) {
    Alert.alert("Apagar o local", `Apagar "${p.name}" para sempre?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBoServicePoint(p.id);
            load(true);
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const all = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>⛽ Postos e oficinas</Title>
        <Text style={u.muted}>Os postos de combustível, oficinas, estacionamentos, serviços de manutenção e assistência que os transportadores veem. Eles podem sugerir locais novos, que ficam por analisar até os publicar.</Text>

        {canManage ? <Btn label="➕ Criar um local" onPress={() => navigation.navigate("BoServicePointForm")} /> : null}

        <View style={u.row}>
          <Chip label={`Todos (${all})`} active={status === ""} onPress={() => setStatus("")} />
          {catalog.serviceStatus.map((s) => (
            <Chip key={s.value} label={`${s.label} (${counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="Todos os tipos" active={kind === ""} onPress={() => setKind("")} />
          {catalog.serviceKinds.map((k) => (
            <Chip key={k.value} label={`${SERVICE_ICON[k.value] ?? ""} ${k.label}`.trim()} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ScrollView>
        {regions.length > 0 ? <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll /> : null}
        <Field placeholder="Procurar por nome, endereço ou telefone" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} local(is)`}</Text>
        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text={status === "PENDENTE" ? "Não há sugestões por analisar." : "Nenhum local com estes filtros."} /> : null}

        {items.map((p) => {
          const url = pointUrl(p);
          return (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {SERVICE_ICON[p.kind] ?? "📍"} {p.name}
                </Text>
                <Badge label={labelOf(catalog.serviceStatus, p.status) || p.status} color={SERVICE_STATUS_COLOR[p.status] ?? "#757575"} />
              </View>
              <Text style={u.muted}>{labelOf(catalog.serviceKinds, p.kind)}</Text>
              {p.address ? <Text style={{ marginTop: 2 }}>{p.address}</Text> : null}
              <Text style={u.muted}>
                {[p.regionName ? `📍 ${p.regionName}` : "", p.phone ? `📞 ${p.phone}` : "", p.hours ? `🕒 ${p.hours}` : ""].filter(Boolean).join(" · ")}
              </Text>
              {p.notes ? <Text style={[u.muted, { marginTop: 2 }]}>{p.notes}</Text> : null}
              <Text style={u.muted}>
                {p.suggestedByName ? `Sugerido por ${p.suggestedByName} em ${formatDate(p.createdAt)}` : `Criado pela equipa em ${formatDate(p.createdAt)}`}
                {p.exact ? " · com localização exata" : ""}
              </Text>
              {p.reviewNote ? <Text style={[u.muted, { marginTop: 2 }]}>📝 {p.reviewNote}</Text> : null}

              <View style={u.row}>
                {url ? <Btn small kind="outline" label="🧭 Ver no mapa" onPress={() => Linking.openURL(url)} /> : null}
                {canManage && p.status !== "PUBLICADO" ? <Btn small label="✅ Publicar" onPress={() => openReview(p.id, "PUBLICAR")} /> : null}
                {canManage && p.status !== "ESCONDIDO" ? <Btn small kind="outline" label="🙈 Esconder" onPress={() => openReview(p.id, "ESCONDER")} /> : null}
                {canManage ? <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("BoServicePointForm", { point: p })} /> : null}
                {canManage ? <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} /> : null}
              </View>

              {reviewId === p.id ? (
                <View style={{ marginTop: 8 }}>
                  <Field label={decision === "PUBLICAR" ? "Nota (opcional)" : "Porque é escondido (quem sugeriu vê)"} value={note} onChangeText={setNote} multiline />
                  <Btn kind={decision === "PUBLICAR" ? "primary" : "danger"} label={saving ? "A guardar..." : "Confirmar"} onPress={() => submitReview(p)} disabled={saving} />
                </View>
              ) : null}
            </Card>
          );
        })}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
