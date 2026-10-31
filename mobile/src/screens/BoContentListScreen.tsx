import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import HideControl from "../components/admin/HideControl";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoContent, hideBoContent, restoreBoContent, saveBoHighlight } from "../api/backoffice";
import { adminCan } from "../utils/adminSession";
import { CONTENT_KIND_ICON, CONTENT_KIND_TITLE, HIGHLIGHT_OF } from "../constants/backofficeOrgs";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const DAYS = [7, 14, 30, 60];

// Lista de um tipo de conteúdo: pesquisar, esconder, repor e pôr em destaque
export default function BoContentListScreen({ navigation, route }: any) {
  const kind: string = route?.params?.kind ?? "PUBLICATION";
  const highlightKind = HIGHLIGHT_OF[kind];
  const canEdit = adminCan("content.manage", "orgs.manage", "events.manage");
  const canHighlight = adminCan("content.manage", "events.manage");

  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({ all: 0, hidden: 0 });
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [featureId, setFeatureId] = useState("");
  const [days, setDays] = useState(14);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus("");
    setQ("");
    setText("");
  }, [kind]);

  const key = JSON.stringify({ kind, status, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoContent(kind, { status, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setAvailable(r.available);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar a lista."));
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

  async function feature(refId: string) {
    setSaving(true);
    try {
      await saveBoHighlight({ kind: highlightKind, refId, days });
      setFeatureId("");
      load(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível pôr em destaque."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>
          {CONTENT_KIND_ICON[kind]} {CONTENT_KIND_TITLE[kind] ?? "Conteúdo"}
        </Title>

        {!available ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>Este tipo de conteúdo não foi encontrado nesta versão do servidor.</Text>
            <Text style={u.muted}>Na ligação final confirmo o nome da tabela e a lista passa a aparecer.</Text>
          </Card>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["📦 Total", summary.all],
              ["🙈 Escondidos", summary.hidden],
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
          <Chip label="Todos" active={status === ""} onPress={() => setStatus("")} />
          <Chip label="Visíveis" active={status === "visible"} onPress={() => setStatus("visible")} />
          <Chip label="Escondidos" active={status === "hidden"} onPress={() => setStatus("hidden")} />
        </View>

        <Field
          placeholder="Procurar pelo título ou texto"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} resultado(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && available && items.length === 0 ? <Empty text="Nada encontrado." /> : null}

        {items.map((c) => (
          <Card key={c.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                {c.title}
              </Text>
              {c.hidden ? <Badge label="Escondido" color="#C62828" /> : c.featured ? <Badge label="⭐ Destaque" color="#F9A825" /> : null}
            </View>
            <Text style={u.muted}>
              {c.type ? `${c.type} · ` : ""}
              {c.owner ?? "Autor desconhecido"} · {formatDate(c.createdAt)}
            </Text>

            {canEdit ? (
              <HideControl
                hidden={c.hidden}
                hiddenReason={c.hiddenReason}
                onHide={(reason) => hideBoContent({ kind, refId: c.id, reason })}
                onRestore={(reason) => restoreBoContent({ kind, refId: c.id, reason })}
                onDone={() => load(true)}
              />
            ) : null}

            {highlightKind && canHighlight && !c.hidden ? (
              c.featured ? (
                <Btn small kind="outline" label="⭐ Gerir destaques" onPress={() => navigation.navigate("BoHighlights", { kind: highlightKind })} />
              ) : (
                <>
                  <Btn small kind="outline" label={featureId === c.id ? "Cancelar" : "⭐ Pôr em destaque"} onPress={() => setFeatureId(featureId === c.id ? "" : c.id)} />
                  {featureId === c.id ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={u.label}>Por quantos dias?</Text>
                      <View style={u.row}>
                        {DAYS.map((n) => (
                          <Chip key={n} label={`${n} dias`} active={days === n} onPress={() => setDays(n)} />
                        ))}
                      </View>
                      <Btn label={saving ? "A guardar..." : "Confirmar destaque"} onPress={() => feature(c.id)} disabled={saving} />
                    </View>
                  ) : null}
                </>
              )
            ) : null}
          </Card>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
