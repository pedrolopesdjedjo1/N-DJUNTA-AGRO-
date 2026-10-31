import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import HideControl from "../components/admin/HideControl";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  listBoGovPrograms,
  listBoGovServices,
  listBoGovPublications,
  listBoGovRequests,
  setBoGovServicePublished,
  hideBoOrgContent,
  restoreBoOrgContent,
} from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { adminCan } from "../utils/adminSession";
import { GOV_LISTS } from "../constants/backofficeOrgs";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

type Kind = "programs" | "services" | "publications" | "requests";

const PUBLICATION_KINDS = [
  { value: "COMUNICADO", label: "Comunicados" },
  { value: "AVISO", label: "Avisos" },
  { value: "INFORMACAO", label: "Informações" },
];

const REQUEST_STATUS = [
  { value: "OPEN", label: "Em aberto" },
  { value: "FINAL", label: "Concluídos" },
];

// Uma só tela para as quatro listas do governo: programas, serviços, publicações e pedidos
export default function BoGovListScreen({ navigation, route }: any) {
  const kind: Kind = (route?.params?.kind as Kind) ?? "programs";
  const meta = GOV_LISTS[kind];
  const canHide = adminCan("orgs.manage", "content.manage");

  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [published, setPublished] = useState("");
  const [pubKind, setPubKind] = useState("");
  const [reqStatus, setReqStatus] = useState("OPEN");
  const [stuck, setStuck] = useState(false);
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [extra, setExtra] = useState<any>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  const key = JSON.stringify({ kind, q, published, pubKind, reqStatus, stuck, region });

  function fetchPage(n: number): Promise<any> {
    switch (kind) {
      case "services":
        return listBoGovServices({ published, q, region, page: n });
      case "publications":
        return listBoGovPublications({ kind: pubKind, q, page: n });
      case "requests":
        return listBoGovRequests({ status: reqStatus, stuck, region, q, page: n });
      default:
        return listBoGovPrograms({ q, page: n });
    }
  }

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await fetchPage(nextPage);
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setExtra(r);
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

  const s = extra.summary ?? {};

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>{meta.title}</Title>
        <Text style={u.muted}>{meta.hint}</Text>

        {kind === "services" && s.all !== undefined ? (
          <View style={u.grid}>
            {(
              [
                ["🏢 Serviços", s.all],
                ["✅ Publicados", s.published],
                ["🙈 Escondidos", s.hidden],
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
        ) : null}

        {kind === "requests" && s.total !== undefined ? (
          <View style={u.grid}>
            {(
              [
                ["📨 Pedidos", s.total],
                ["⏳ Em aberto", s.open],
                ["🚨 Parados há +7 dias", s.stuck],
              ] as [string, number][]
            ).map(([label, value]) => (
              <View key={label} style={u.tile}>
                <View style={u.tileBox}>
                  <Text style={[u.tileValue, { color: label.includes("Parados") && value > 0 ? "#C62828" : undefined }]}>{formatNumber(value)}</Text>
                  <Text style={u.tileLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Field
          placeholder="Procurar"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {kind === "services" ? (
          <View style={u.row}>
            <Chip label="Todos" active={published === ""} onPress={() => setPublished("")} />
            <Chip label="Publicados" active={published === "yes"} onPress={() => setPublished("yes")} />
            <Chip label="Escondidos" active={published === "no"} onPress={() => setPublished("no")} />
          </View>
        ) : null}
        {kind === "publications" ? <ChipGroup label="Tipo" options={PUBLICATION_KINDS} value={pubKind} onChange={setPubKind} allowEmpty scroll /> : null}
        {kind === "requests" ? (
          <>
            <View style={u.row}>
              {REQUEST_STATUS.map((r) => (
                <Chip key={r.value} label={r.label} active={reqStatus === r.value} onPress={() => setReqStatus(r.value)} />
              ))}
              <Chip label="Todos" active={reqStatus === ""} onPress={() => setReqStatus("")} />
              <Chip label="🚨 Só os parados" active={stuck} onPress={() => setStuck(!stuck)} />
            </View>
          </>
        ) : null}
        {(kind === "services" || kind === "requests") && regions.length > 0 ? (
          <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} resultado(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nada encontrado." /> : null}

        {kind === "programs"
          ? items.map((p) => (
              <Card key={p.id}>
                <Text style={u.strong}>📋 {p.name}</Text>
                <Text style={u.muted}>🏛️ {p.institution}</Text>
                <Text style={u.muted}>
                  {p.status ? `${p.status} · ` : ""}
                  {p.projects} projeto(s){p.createdAt ? ` · ${formatDate(p.createdAt)}` : ""}
                </Text>
              </Card>
            ))
          : null}

        {kind === "services"
          ? items.map((sv) => (
              <Card key={sv.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>🏢 {sv.name}</Text>
                  <Badge label={sv.isPublished ? "Publicado" : "Escondido"} color={sv.isPublished ? "#2E7D32" : "#757575"} />
                </View>
                <Text style={u.muted}>
                  {sv.category ?? "Serviço"}
                  {sv.institution ? ` · ${sv.institution}` : ""}
                </Text>
                {sv.address || sv.region ? <Text style={u.muted}>📍 {[sv.address, sv.region].filter(Boolean).join(", ")}</Text> : null}
                {canHide ? (
                  <HideControl
                    hidden={!sv.isPublished}
                    hideLabel="Esconder o serviço"
                    restoreLabel="Voltar a publicar"
                    onHide={(reason) => setBoGovServicePublished(sv.id, false, reason)}
                    onRestore={(reason) => setBoGovServicePublished(sv.id, true, reason)}
                    onDone={() => load(true)}
                  />
                ) : null}
              </Card>
            ))
          : null}

        {kind === "publications"
          ? items.map((p) => (
              <Card key={p.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>📢 {p.title}</Text>
                  {p.hidden ? <Badge label="Escondida" color="#C62828" /> : null}
                </View>
                <Text style={u.muted}>
                  {p.type ? `${p.type} · ` : ""}
                  🏛️ {p.institution} · {formatDate(p.createdAt)}
                </Text>
                {canHide ? (
                  <HideControl
                    hidden={p.hidden}
                    onHide={(reason) => hideBoOrgContent({ kind: "PUBLICATION", refId: p.id, reason })}
                    onRestore={(reason) => restoreBoOrgContent({ kind: "PUBLICATION", refId: p.id, reason })}
                    onDone={() => load(true)}
                  />
                ) : null}
              </Card>
            ))
          : null}

        {kind === "requests" ? (
          <>
            {(extra.byHandler ?? []).length > 0 ? (
              <>
                <SubTitle>Por instituição (em aberto)</SubTitle>
                {(extra.byHandler as any[]).map((h) => (
                  <Card key={h.name}>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{h.name}</Text>
                      {h.stuck > 0 ? <Badge label={`${h.stuck} parado(s)`} color="#C62828" /> : null}
                    </View>
                    <Text style={u.muted}>{h.open} pedido(s) em aberto</Text>
                  </Card>
                ))}
              </>
            ) : null}

            <SubTitle>Pedidos</SubTitle>
            {items.map((r) => (
              <Card key={r.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.protocol ?? "Sem protocolo"}</Text>
                  {r.stuck ? <Badge label={`Parado há ${r.idleDays} dias`} color="#C62828" /> : <Badge label={r.final ? "Concluído" : "Em aberto"} color={r.final ? "#2E7D32" : "#F9A825"} />}
                </View>
                <Text style={u.muted}>
                  {r.category ?? "Pedido"}
                  {r.status ? ` · ${r.status}` : ""}
                  {r.region ? ` · 📍 ${r.region}` : ""}
                </Text>
                <Text style={{ marginTop: 4, lineHeight: 19 }} numberOfLines={3}>
                  {r.description}
                </Text>
                <Text style={u.muted}>
                  {r.handler ? `🏛️ ${r.handler}` : "Sem instituição"} · aberto há {r.ageDays} dia(s)
                </Text>
              </Card>
            ))}
            {extra.note ? <Text style={[u.muted, { marginTop: 6 }]}>🔒 {extra.note}</Text> : null}
          </>
        ) : null}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
