import React, { useCallback, useState } from "react";
import { View, Text, Image, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getBoProduct,
  approveBoProduct,
  rejectBoProduct,
  removeBoProduct,
  restoreBoProduct,
  flagBoProductQuality,
  featureBoProduct,
  unfeatureBoProduct,
} from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { FEATURE_DAYS, MODERATION_STATUS_COLOR, MODERATION_STATUS_LABEL, QUALITY_ICON, DEPARTMENT_ICON, priceText } from "../constants/backofficeMarket";
import { REPORT_CATEGORY_ICON, REPORT_STATUS_COLOR } from "../constants/backofficeModeration";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "approve" | "reject" | "remove" | "restore" | "quality" | "feature";

const PANEL_TITLE: Record<string, string> = {
  approve: "Aprovar o produto",
  reject: "Rejeitar o produto",
  remove: "Remover o produto proibido",
  restore: "Repor no mercado",
  quality: "Avisar o vendedor para melhorar o anúncio",
  feature: "Pôr em destaque",
};

function detailRows(details: any): [string, string][] {
  if (!details || typeof details !== "object") return [];
  const rows: [string, string][] = [];
  Object.keys(details).forEach((key) => {
    const value = details[key];
    if (value === null || value === undefined || value === "" || typeof value === "object") return;
    rows.push([key, String(value)]);
  });
  return rows.slice(0, 12);
}

export default function BoProductScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoProduct(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [reason, setReason] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [days, setDays] = useState(14);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <AdminLayout active="BoMarket">
        <Page loader={loader}>
          <Title>Produto</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const p = d.product;
  const mod = p.moderation;
  const owner = p.owner;
  const canModerate = adminCan("market.moderate");
  const hiddenByTeam = mod && (mod.status === "REJEITADO" || mod.status === "REMOVIDO");
  const rows = detailRows(p.details);

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setReason("");
    setFlags([]);
    setDays(14);
    setText("");
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const note = text.trim();

    if (panel === "approve") return run(() => approveBoProduct(id, note || undefined), "Não foi possível aprovar.");

    if (panel === "reject" || panel === "remove") {
      if (!reason) return Alert.alert("Atenção", "Escolha o motivo.");
      if (note.length < 5) return Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). O vendedor vê esta explicação.");
      const go = () => run(() => (panel === "reject" ? rejectBoProduct(id, { reason, note }) : removeBoProduct(id, { reason, note })), "Não foi possível guardar a decisão.");
      if (panel === "remove") {
        return Alert.alert("Remover o produto", "O produto sai do mercado, as denúncias abertas sobre ele ficam resolvidas e quem denunciou é avisado. Continuar?", [
          { text: "Não", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: go },
        ]);
      }
      return go();
    }

    if (panel === "restore") {
      if (note.length < 3) return Alert.alert("Atenção", "Explique porque o produto volta ao mercado.");
      return run(() => restoreBoProduct(id, note), "Não foi possível repor.");
    }

    if (panel === "quality") {
      if (flags.length === 0) return Alert.alert("Atenção", "Escolha o que há a corrigir.");
      return run(() => flagBoProductQuality(id, { flags, note: note || undefined }), "Não foi possível enviar o aviso.");
    }

    if (panel === "feature") return run(() => featureBoProduct(id, days), "Não foi possível pôr em destaque.");
    return undefined;
  }

  return (
    <AdminLayout active="BoMarket">
      <Page loader={loader}>
        {p.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {p.images.map((uri: string, i: number) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={{ width: 230, height: 170, borderRadius: 10, marginRight: 10 }} />
            ))}
          </ScrollView>
        ) : null}

        <Title>{p.title}</Title>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>{priceText(p.price, p.unit)}</Text>

        <View style={u.row}>
          {p.isAvailable ? <Badge label="Visível" color="#2E7D32" /> : <Badge label={hiddenByTeam ? "Escondido pela equipa" : "Escondido"} color="#757575" />}
          {mod ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={MODERATION_STATUS_LABEL[mod.status] ?? mod.status} color={MODERATION_STATUS_COLOR[mod.status] ?? "#757575"} />
            </View>
          ) : p.toReview ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label="Novo, por rever" color="#1565C0" />
            </View>
          ) : null}
          {p.featured ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`⭐ Destaque até ${formatDate(p.featured.endsAt)}`} color="#F9A825" />
            </View>
          ) : null}
        </View>

        {p.conflict ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>⚠️ O produto está visível apesar de a equipa o ter {mod?.status === "REMOVIDO" ? "removido" : "rejeitado"}</Text>
            <Text style={u.muted}>O vendedor voltou a publicá-lo. Remova-o de novo ou fale com ele.</Text>
          </Card>
        ) : null}

        {mod?.reason ? (
          <Card>
            <Text style={u.strong}>Decisão da equipa</Text>
            {mod.category ? <Text style={u.muted}>{labelOf(catalog.moderationReasons, mod.category) || mod.category}</Text> : null}
            <Text style={{ marginTop: 2 }}>{mod.reason}</Text>
            <Text style={u.muted}>{formatDateTime(mod.reviewedAt)}</Text>
          </Card>
        ) : null}

        {p.quality.length > 0 ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>🔍 O que há a melhorar neste anúncio</Text>
            {p.quality.map((f: string) => (
              <Text key={f} style={{ marginTop: 3 }}>
                {QUALITY_ICON[f] ?? "•"} {labelOf(catalog.qualityFlags, f) || f}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          {p.department ? <Text>{DEPARTMENT_ICON[p.department] ?? "📦"} {labelOf(catalog.departments, p.department) || p.department}</Text> : null}
          {p.subcategory ? <Text style={u.muted}>{p.subcategory}</Text> : null}
          {p.stock !== null && p.stock !== undefined ? <Text style={u.muted}>📦 Quantidade: {p.stock}</Text> : null}
          {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
          <Text style={u.muted}>Publicado em {formatDate(p.createdAt)}</Text>
          <Text style={u.muted}>
            🧾 Vendas: {d.sales.orders} encomenda(s), {d.sales.quantity} unidade(s)
          </Text>
        </Card>

        {p.description ? (
          <>
            <SubTitle>Descrição</SubTitle>
            <Text style={{ lineHeight: 21 }}>{p.description}</Text>
          </>
        ) : null}

        {rows.length > 0 ? (
          <>
            <SubTitle>Detalhes</SubTitle>
            <Card>
              {rows.map(([k, v]) => (
                <View key={k} style={[u.between, { marginTop: 4 }]}>
                  <Text style={[u.muted, { flex: 1, marginRight: 8 }]}>{k}</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>{v}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SubTitle>Vendedor</SubTitle>
        <Card>
          {owner ? (
            <>
              <Text style={u.strong}>
                {owner.name} {owner.isVerified ? "✅" : ""}
              </Text>
              <Text style={u.muted}>
                {owner.roleName}
                {owner.location ? ` · 📍 ${owner.location}` : ""}
              </Text>
              {!owner.isActive ? <Text style={{ color: "#C62828" }}>Conta inativa</Text> : null}
              <Text style={u.muted}>🛍️ {d.ownerProducts} produto(s) publicado(s)</Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: owner.id })} />
                <Btn small kind="outline" label="Outros produtos dele(a)" onPress={() => navigation.navigate("BoMarket", { ownerId: owner.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: owner.id, userName: owner.name })} />
              </View>
            </>
          ) : (
            <Text style={u.muted}>Conta removida.</Text>
          )}
        </Card>

        {canModerate ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              {!hiddenByTeam ? <Btn small label="✅ Aprovar" onPress={() => open("approve")} /> : null}
              {!hiddenByTeam ? <Btn small kind="outline" label="⚠️ Avisar qualidade" onPress={() => open("quality")} /> : null}
              {!hiddenByTeam ? <Btn small kind="outline" label="↩️ Rejeitar" onPress={() => open("reject")} /> : null}
              {!hiddenByTeam ? <Btn small kind="danger" label="🗑️ Remover (proibido)" onPress={() => open("remove")} /> : null}
              {hiddenByTeam ? <Btn small label="↩️ Repor no mercado" onPress={() => open("restore")} /> : null}
              {p.isAvailable && !p.featured ? <Btn small kind="outline" label="⭐ Destacar" onPress={() => open("feature")} /> : null}
              {p.featured ? <Btn small kind="outline" label="Tirar do destaque" onPress={() => run(() => unfeatureBoProduct(id), "Não foi possível tirar do destaque.")} disabled={busy} /> : null}
            </View>
            <Text style={u.muted}>
              Rejeitar pede ao vendedor que corrija o anúncio. Remover é para produtos proibidos e fecha as denúncias abertas sobre ele.
            </Text>
          </>
        ) : null}

        {panel ? (
          <Card>
            <Text style={u.strong}>{PANEL_TITLE[panel]}</Text>

            {panel === "reject" || panel === "remove" ? (
              <ChipGroup label="Motivo" options={catalog.moderationReasons} value={reason} onChange={setReason} />
            ) : null}

            {panel === "quality" ? (
              <>
                <Text style={u.label}>O que há a corrigir</Text>
                <View style={u.row}>
                  {catalog.qualityFlags.map((f) => (
                    <Chip
                      key={f.value}
                      label={`${QUALITY_ICON[f.value] ?? ""} ${f.label}`.trim()}
                      active={flags.includes(f.value)}
                      onPress={() => setFlags((prev) => (prev.includes(f.value) ? prev.filter((x) => x !== f.value) : [...prev, f.value]))}
                    />
                  ))}
                </View>
                <Text style={u.muted}>O produto continua visível. O vendedor recebe um aviso para corrigir.</Text>
              </>
            ) : null}

            {panel === "feature" ? (
              <>
                <Text style={u.label}>Por quantos dias?</Text>
                <View style={u.row}>
                  {FEATURE_DAYS.map((n) => (
                    <Chip key={n} label={`${n} dias`} active={days === n} onPress={() => setDays(n)} />
                  ))}
                </View>
                <Text style={u.muted}>Só se destacam produtos visíveis. Há um máximo de 20 destaques ao mesmo tempo.</Text>
              </>
            ) : null}

            {panel !== "feature" ? (
              <Field
                label={panel === "restore" ? "Porque volta ao mercado (o vendedor vê)" : panel === "reject" || panel === "remove" ? "Explicação (o vendedor vê)" : "Nota (opcional)"}
                value={text}
                onChangeText={setText}
                multiline
                placeholder={panel === "reject" ? "Ex: A foto não mostra o produto. Envie uma foto real." : ""}
              />
            ) : null}

            <View style={u.row}>
              <Btn kind={panel === "remove" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>🚩 Denúncias ({d.reports.length})</SubTitle>
        {d.reports.length === 0 ? (
          <Text style={u.muted}>Nenhuma denúncia sobre este produto.</Text>
        ) : (
          d.reports.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {REPORT_CATEGORY_ICON[r.category] ?? "📝"} {labelOf(catalog.reportCategories, r.category) || r.category}
                </Text>
                <Badge label={labelOf(catalog.reportStatus, r.status) || r.status} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
              </View>
              <Text style={{ marginTop: 2 }} numberOfLines={3}>
                {r.description}
              </Text>
              <Text style={u.muted}>{formatDateTime(r.createdAt)}</Text>
              {adminCan("reports.view") ? <Btn small kind="outline" label="Abrir a denúncia" onPress={() => navigation.navigate("BoReport", { id: r.id })} /> : null}
            </Card>
          ))
        )}

        <SubTitle>Histórico de decisões</SubTitle>
        {d.history.length === 0 ? (
          <Text style={u.muted}>A equipa ainda não tomou decisões sobre este produto.</Text>
        ) : (
          d.history.map((h: any) => (
            <Card key={h.id}>
              <Text style={u.strong}>{labelOf(catalog.auditActions, h.action) || h.action}</Text>
              <Text style={{ marginTop: 2 }}>{h.summary}</Text>
              <Text style={u.muted}>
                {h.adminName} · {formatDateTime(h.createdAt)}
              </Text>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
