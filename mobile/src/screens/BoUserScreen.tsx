import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import {
  getBoUser,
  suspendBoUser,
  blockBoUser,
  reactivateBoUser,
  verifyBoUser,
  unverifyBoUser,
} from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { BO_ROLE_ICON, SANCTION_COLOR } from "../constants/backoffice";
import { stars } from "../constants/transporter";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "suspend" | "block" | "reactivate" | "verify" | "unverify";

const DAY_OPTIONS = [1, 3, 7, 15, 30, 90];

const TIMELINE_ICON: Record<string, string> = {
  ENCOMENDA: "📦",
  PRODUTO: "🛍️",
  DENUNCIA: "🚩",
  SANCAO: "⛔",
  VERIFICACAO: "🆔",
};

const PANEL_TITLE: Record<string, string> = {
  suspend: "Suspender a conta",
  block: "Bloquear a conta",
  reactivate: "Reativar a conta",
  verify: "Verificar a identidade",
  unverify: "Retirar a verificação",
};

export default function BoUserScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoUser(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [days, setDays] = useState(7);
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
      <AdminLayout active="BoUsers">
        <Page loader={loader}>
          <Title>Utilizador</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const user = d.user;
  const role = String(user.role);
  const isAdminAccount = role === "ADMIN";
  const sanction = d.activeSanction;
  const wa = whatsappUrl(user.phone);
  const canManage = adminCan("users.manage") && !isAdminAccount;
  const canVerify = adminCan("users.verify") && !isAdminAccount;

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setDays(7);
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

    if (panel === "suspend") {
      if (note.length < 5) return Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). A pessoa vê esta explicação.");
      return run(() => suspendBoUser(id, { days, reason: note }), "Não foi possível suspender a conta.");
    }
    if (panel === "block") {
      if (note.length < 5) return Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). A pessoa vê esta explicação.");
      return Alert.alert("Bloquear a conta", `${user.name} deixa de poder usar o app e os produtos dela ficam escondidos. Só a equipa pode reativar. Continuar?`, [
        { text: "Não", style: "cancel" },
        { text: "Bloquear", style: "destructive", onPress: () => run(() => blockBoUser(id, { reason: note }), "Não foi possível bloquear a conta.") },
      ]);
    }
    if (panel === "reactivate") {
      if (note.length < 3) return Alert.alert("Atenção", "Explique porque a conta volta a funcionar.");
      return run(() => reactivateBoUser(id, { note }), "Não foi possível reativar a conta.");
    }
    if (panel === "verify") return run(() => verifyBoUser(id, note || undefined), "Não foi possível verificar.");
    if (panel === "unverify") {
      if (note.length < 3) return Alert.alert("Atenção", "Explique porque a verificação é retirada.");
      return run(() => unverifyBoUser(id, note), "Não foi possível retirar a verificação.");
    }
    return undefined;
  }

  const s = d.stats;
  const pendingIdentity = (d.identity as any[]).find((i) => i.status === "PENDENTE");

  return (
    <AdminLayout active="BoUsers">
      <Page loader={loader}>
        <View style={[u.row, { alignItems: "center" }]}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={[u.photo, { width: 72, height: 72, borderRadius: 36 }]} />
          ) : (
            <View style={[u.photo, { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 30 }}>{BO_ROLE_ICON[role] ?? "👤"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Title>
              {user.name} {user.isVerified ? "✅" : ""}
            </Title>
            <Text style={u.muted}>{user.roleName}</Text>
            <View style={[u.row, { marginTop: 4 }]}>
              {sanction ? (
                <Badge label={sanction.kind === "BLOQUEIO" ? "Bloqueada" : "Suspensa"} color={SANCTION_COLOR[sanction.kind] ?? "#C62828"} />
              ) : user.isActive ? (
                <Badge label="Ativa" color="#2E7D32" />
              ) : (
                <Badge label="Inativa" color="#757575" />
              )}
            </View>
          </View>
        </View>

        <Card>
          {user.location ? <Text>📍 {user.location}</Text> : null}
          {user.phone ? <Text style={u.muted}>📞 {user.phone}</Text> : null}
          <Text style={u.muted}>Conta criada em {formatDate(user.createdAt)}</Text>
          {d.rating.average ? <Text style={u.muted}>{stars(d.rating.average)} {d.rating.average} ({d.rating.count} avaliação(ões))</Text> : null}
          <View style={u.row}>
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: user.id, userName: user.name })} />
            {user.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${user.phone}`)} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
          </View>
        </Card>

        {sanction ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>{sanction.kind === "BLOQUEIO" ? "⛔ Conta bloqueada" : "⏳ Conta suspensa"}</Text>
            <Text style={{ marginTop: 4 }}>Motivo: {sanction.reason}</Text>
            <Text style={u.muted}>
              Desde {formatDateTime(sanction.startsAt)}
              {sanction.endsAt ? ` · termina em ${formatDateTime(sanction.endsAt)}` : " · sem prazo"}
            </Text>
            {sanction.hiddenProductIds?.length > 0 ? <Text style={u.muted}>🛍️ {sanction.hiddenProductIds.length} produto(s) escondido(s) durante a sanção</Text> : null}
          </Card>
        ) : null}

        {isAdminAccount ? (
          <Card>
            <Text style={u.muted}>Esta é uma conta de administrador. Gere-se na equipa de administradores.</Text>
            {adminCan("team.manage") ? <Btn small kind="outline" label="Abrir na equipa" onPress={() => navigation.navigate("BoTeam")} /> : null}
          </Card>
        ) : null}

        <SubTitle>Ações</SubTitle>
        <View style={u.row}>
          {canManage ? <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("BoUserEdit", { id })} /> : null}
          {canManage && !sanction ? <Btn small kind="outline" label="⏳ Suspender" onPress={() => open("suspend")} /> : null}
          {canManage && !sanction ? <Btn small kind="danger" label="⛔ Bloquear" onPress={() => open("block")} /> : null}
          {canManage && (sanction || !user.isActive) ? <Btn small label="🔓 Reativar" onPress={() => open("reactivate")} /> : null}
          {canVerify && !user.isVerified ? <Btn small label="✅ Verificar" onPress={() => open("verify")} /> : null}
          {canVerify && user.isVerified ? <Btn small kind="outline" label="Retirar verificação" onPress={() => open("unverify")} /> : null}
        </View>
        {sanction && canManage ? <Text style={u.muted}>Para mudar a sanção atual, reative a conta e aplique a nova.</Text> : null}

        {panel ? (
          <Card>
            <Text style={u.strong}>{PANEL_TITLE[panel]}</Text>

            {panel === "suspend" ? (
              <>
                <Text style={u.label}>Por quantos dias?</Text>
                <View style={u.row}>
                  {DAY_OPTIONS.map((n) => (
                    <Chip key={n} label={`${n} dia${n > 1 ? "s" : ""}`} active={days === n} onPress={() => setDays(n)} />
                  ))}
                </View>
                <Text style={u.muted}>Os produtos à venda ficam escondidos até a suspensão terminar.</Text>
              </>
            ) : null}
            {panel === "block" ? <Text style={u.muted}>O bloqueio não tem prazo. A pessoa não pode usar o app e os produtos ficam escondidos.</Text> : null}
            {panel === "verify" ? <Text style={u.muted}>Confirma que a identidade desta pessoa foi conferida? Ela recebe o selo de verificada.</Text> : null}

            <Field
              label={panel === "verify" ? "Nota (opcional)" : panel === "reactivate" ? "Porque volta a funcionar" : "Motivo (a pessoa vê)"}
              value={text}
              onChangeText={setText}
              multiline
              placeholder={panel === "suspend" ? "Ex: Preços enganosos nos anúncios. Corrija antes de voltar." : ""}
            />
            <View style={u.row}>
              <Btn kind={panel === "block" || panel === "unverify" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>Resumo</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["🛍️ Produtos à venda", `${s.availableProducts} de ${s.products}`],
              ["🛒 Compras", s.buyerOrders],
              ["🏪 Vendas", s.sellerOrders],
              ["🚩 Denúncias contra", s.reportsAgainst],
              ["📝 Denúncias feitas", s.reportsFiled],
              ...(role === "TRANSPORTADOR" ? [["🚚 Entregas", s.delivered]] : []),
            ] as [string, any][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 16 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={u.row}>
          {adminCan("market.view") ? <Btn small kind="outline" label="🛍️ Produtos" onPress={() => navigation.navigate("BoMarket", { ownerId: id })} /> : null}
          {adminCan("orders.view") ? <Btn small kind="outline" label="🛒 Compras" onPress={() => navigation.navigate("BoOrders", { buyerId: id })} /> : null}
          {adminCan("orders.view") ? <Btn small kind="outline" label="🏪 Vendas" onPress={() => navigation.navigate("BoOrders", { sellerId: id })} /> : null}
        </View>

        {d.transporter ? (
          <Card>
            <Text style={u.strong}>🚚 Transportador</Text>
            <Text style={u.muted}>
              Verificação: {d.transporter.verificationStatus}
              {d.transporter.plate ? ` · ${d.transporter.plate}` : ""}
            </Text>
            {adminCan("transport.manage") ? <Btn small kind="outline" label="Ver verificação" onPress={() => navigation.navigate("BoTransportVerification")} /> : null}
          </Card>
        ) : null}
        {d.agent ? (
          <Card>
            <Text style={u.strong}>🤝 Agente</Text>
            <Text style={u.muted}>Estado: {d.agent.status}</Text>
            {adminCan("users.manage") ? <Btn small kind="outline" label="Ver na gestão de agentes" onPress={() => navigation.navigate("AdminAgents")} /> : null}
          </Card>
        ) : null}
        {d.organization ? (
          <Card>
            <Text style={u.strong}>
              {role === "GOVERNO" ? "🏛️" : "🌍"} {d.organization.name} {d.organization.isVerified ? "✅" : ""}
            </Text>
            {adminCan("orgs.manage", "profiles.view", "gov.view") ? <Btn small kind="outline" label="Abrir a organização" onPress={() => navigation.navigate("BoOrg", { userId: id })} /> : null}
          </Card>
        ) : null}

        <SubTitle>🆔 Verificação de identidade</SubTitle>
        {d.identity.length === 0 ? (
          <Text style={u.muted}>Ainda não pediu a verificação.</Text>
        ) : (
          d.identity.map((i: any) => (
            <Card key={i.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.identityKinds, i.documentKind) || i.documentKind}</Text>
                <Badge label={labelOf(catalog.identityStatus, i.status) || i.status} color={i.status === "APROVADA" ? "#2E7D32" : i.status === "RECUSADA" ? "#C62828" : "#F9A825"} />
              </View>
              <Text style={u.muted}>{formatDateTime(i.createdAt)}</Text>
              {i.reviewNote ? <Text style={u.muted}>📝 {i.reviewNote}</Text> : null}
              {adminCan("users.verify") ? <Btn small kind="outline" label="Abrir o pedido" onPress={() => navigation.navigate("BoIdentityReview", { id: i.id })} /> : null}
            </Card>
          ))
        )}
        {pendingIdentity ? <Text style={{ color: "#EF6C00" }}>⏳ Há um pedido à espera de análise.</Text> : null}

        <SubTitle>🚩 Denúncias contra esta pessoa ({d.reportsAgainst.length})</SubTitle>
        {d.reportsAgainst.length === 0 ? (
          <Text style={u.muted}>Nenhuma denúncia.</Text>
        ) : (
          d.reportsAgainst.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.reportCategories, r.category) || r.category}</Text>
                <Badge label={labelOf(catalog.reportStatus, r.status) || r.status} color={r.status === "RESOLVIDA" || r.status === "ARQUIVADA" ? "#2E7D32" : "#F9A825"} />
              </View>
              <Text style={{ marginTop: 4 }} numberOfLines={3}>
                {r.description}
              </Text>
              <Text style={u.muted}>{formatDateTime(r.createdAt)}</Text>
              {adminCan("reports.view") ? <Btn small kind="outline" label="Abrir a denúncia" onPress={() => navigation.navigate("BoReport", { id: r.id })} /> : null}
            </Card>
          ))
        )}

        <SubTitle>Atividade recente</SubTitle>
        {d.timeline.length === 0 ? (
          <Text style={u.muted}>Sem atividade registada.</Text>
        ) : (
          d.timeline.map((t: any, i: number) => (
            <View key={`${t.at}-${i}`} style={{ marginTop: 6 }}>
              <Text>
                {TIMELINE_ICON[t.kind] ?? "•"} {t.text}
              </Text>
              <Text style={u.muted}>{formatDateTime(t.at)}</Text>
            </View>
          ))
        )}

        <SubTitle>Sanções ({d.sanctions.length})</SubTitle>
        {d.sanctions.length === 0 ? (
          <Text style={u.muted}>Nunca foi suspensa nem bloqueada.</Text>
        ) : (
          d.sanctions.map((x: any) => (
            <Card key={x.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{x.kind === "BLOQUEIO" ? "Bloqueio" : "Suspensão"}</Text>
                <Badge label={x.status === "ATIVA" ? "Ativa" : "Terminada"} color={x.status === "ATIVA" ? SANCTION_COLOR[x.kind] ?? "#C62828" : "#757575"} />
              </View>
              <Text style={{ marginTop: 2 }}>{x.reason}</Text>
              <Text style={u.muted}>
                {formatDateTime(x.startsAt)}
                {x.endedAt ? ` → ${formatDateTime(x.endedAt)}${x.endNote ? ` (${x.endNote})` : ""}` : ""}
              </Text>
            </Card>
          ))
        )}

        <SubTitle>Histórico de decisões da equipa</SubTitle>
        {d.history.length === 0 ? (
          <Text style={u.muted}>A equipa ainda não tomou decisões sobre esta conta.</Text>
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
