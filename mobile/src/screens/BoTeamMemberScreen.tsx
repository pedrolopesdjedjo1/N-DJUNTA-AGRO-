import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getBoTeamMember,
  updateBoAdmin,
  suspendBoAdmin,
  reactivateBoAdmin,
  demoteBoAdmin,
  unlockBoAdmin,
  resetBoTwoFactor,
  revokeBoSessionsOf,
} from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan, forgetAdminMe, getAdminMeCache } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { LEVEL_COLOR, deviceText } from "../constants/backoffice";
import { PERM_GROUP_ORDER } from "../constants/backofficeComms";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

type Panel = "" | "edit" | "suspend" | "demote";

export default function BoTeamMemberScreen({ navigation, route }: any) {
  const userId: string = route?.params?.userId;
  const catalog = useBoCatalog();
  const me = getAdminMeCache();
  const loader = useLoader(() => getBoTeamMember(userId), null as any, [userId]);
  const d: any = loader.data;
  const canSecurity = adminCan("security.manage");

  const [panel, setPanel] = useState<Panel>("");
  const [level, setLevel] = useState("");
  const [title, setTitle] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const [denied, setDenied] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  if (!adminCan("team.manage")) {
    return (
      <AdminLayout active="BoSystem">
        <Page>
          <Title>Administrador</Title>
          <Empty text="Só os Super administradores gerem a equipa." />
        </Page>
      </AdminLayout>
    );
  }

  if (!d) {
    return (
      <AdminLayout active="BoSystem">
        <Page loader={loader}>
          <Title>Administrador</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const user = d.user;
  const profile = d.profile;
  const isMe = me?.userId === userId;
  const suspended = d.status === "SUSPENSO";
  const locked = !!profile?.lockedUntil && new Date(profile.lockedUntil).getTime() > Date.now();
  const levelInfo = catalog.levels.find((l: any) => l.value === d.level);
  const wanted = panel === "edit" ? level : d.level;
  const levelPerms: string[] = catalog.levelPermissions[wanted] ?? [];

  function open(next: Panel) {
    if (next === "edit") {
      setLevel(d.level);
      setTitle(profile?.title ?? "");
      setExtra(profile?.extraPermissions ?? []);
      setDenied(profile?.deniedPermissions ?? []);
    }
    setPanel(panel === next ? "" : next);
    setNote("");
    setRole("");
  }

  function changeLevel(next: string) {
    setLevel(next);
    setExtra([]);
    setDenied([]);
  }

  function allowed(key: string): boolean {
    if (level === "SUPER_ADMIN") return true;
    return levelPerms.includes(key) ? !denied.includes(key) : extra.includes(key);
  }

  function togglePermission(key: string) {
    if (level === "SUPER_ADMIN") return;
    if (levelPerms.includes(key)) setDenied((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
    else setExtra((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  async function run(work: () => Promise<any>, fail: string, done?: string) {
    setBusy(true);
    try {
      const r = await work();
      if (r?.user) loader.setData(r);
      else loader.reload();
      setPanel("");
      setNote("");
      forgetAdminMe();
      if (done) Alert.alert("Pronto", done);
      return r;
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function saveEdit() {
    run(() => updateBoAdmin(userId, { level, title: title.trim(), extraPermissions: extra, deniedPermissions: denied }), "Não foi possível guardar.", "As permissões foram atualizadas. A pessoa foi avisada.");
  }

  function suspend() {
    if (note.trim().length < 3) return Alert.alert("Atenção", "Explique o motivo da suspensão. A pessoa vê.");
    return run(() => suspendBoAdmin(userId, note.trim()), "Não foi possível suspender.");
  }

  function demote() {
    const previous = profile?.previousRole;
    if (!previous && !role) return Alert.alert("Atenção", "Escolha o perfil para onde a conta volta.");

    return Alert.alert("Retirar o acesso", `${user.name} deixa de ser administrador e a conta volta a ser ${labelOf(catalog.roles, previous ?? role) || previous || role}. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Retirar",
        style: "destructive",
        onPress: async () => {
          const r = await run(() => demoteBoAdmin(userId, previous ? undefined : role), "Não foi possível retirar o acesso.");
          if (r) navigation.goBack();
        },
      },
    ]);
  }

  function confirmSecurity(title2: string, message: string, work: () => Promise<any>, fail: string, done: string) {
    Alert.alert(title2, message, [
      { text: "Não", style: "cancel" },
      { text: "Confirmar", style: "destructive", onPress: () => run(work, fail, done) },
    ]);
  }

  const grouped = PERM_GROUP_ORDER.map((g) => ({ group: g, items: (catalog.permissions as any[]).filter((p) => p.group === g) })).filter((g) => g.items.length > 0);
  const effective: string[] = d.permissions;

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <View style={[u.row, { alignItems: "center" }]}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={[u.photo, { width: 64, height: 64, borderRadius: 32 }]} />
          ) : (
            <View style={[u.photo, { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 28 }}>🛡️</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Title>{user.name}</Title>
            <View style={u.row}>
              <Badge label={d.levelLabel} color={LEVEL_COLOR[d.level] ?? "#1565C0"} />
              <View style={{ marginLeft: 6 }}>
                <Badge label={suspended ? "Suspenso" : "Ativo"} color={suspended ? "#C62828" : "#2E7D32"} />
              </View>
            </View>
          </View>
        </View>

        <Card>
          {profile?.title ? <Text style={u.strong}>{profile.title}</Text> : null}
          {levelInfo ? <Text style={u.muted}>{levelInfo.description}</Text> : null}
          {user.phone ? <Text style={u.muted}>📞 {user.phone}</Text> : null}
          <Text style={u.muted}>{d.legacy ? "Conta de administrador antiga: tem controlo total até lhe definir um nível." : profile?.previousRole ? `Antes de ser administrador: ${labelOf(catalog.roles, profile.previousRole) || profile.previousRole}` : ""}</Text>
          <Text style={u.muted}>
            {profile?.twoFactorEnabled ? "🔐 Autenticação de dois fatores ativa" : "⚠️ Sem autenticação de dois fatores"} · {profile?.backupCodesLeft ?? 0} código(s) de reserva
          </Text>
          <Text style={u.muted}>{profile?.lastLoginAt ? `Último acesso: ${formatDateTime(profile.lastLoginAt)}` : "Ainda não confirmou o acesso"}</Text>
          {suspended && profile?.statusNote ? <Text style={{ color: "#C62828", marginTop: 4 }}>Motivo da suspensão: {profile.statusNote}</Text> : null}
          {locked ? <Text style={{ color: "#C62828", marginTop: 4 }}>🔒 Acesso bloqueado até {formatDateTime(profile.lockedUntil)}</Text> : null}
          <View style={u.row}>
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId, userName: user.name })} />
            {user.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${user.phone}`)} /> : null}
            <Btn small kind="outline" label="🧾 Ver a atividade" onPress={() => navigation.navigate("BoAudit", { adminId: userId, all: true })} />
          </View>
        </Card>

        {!isMe ? (
          <>
            <SubTitle>Gestão</SubTitle>
            <View style={u.row}>
              <Btn small label="✏️ Nível e permissões" onPress={() => open("edit")} />
              {!suspended ? <Btn small kind="danger" label="⛔ Suspender" onPress={() => open("suspend")} /> : <Btn small label="🔓 Reativar" onPress={() => run(() => reactivateBoAdmin(userId), "Não foi possível reativar.")} disabled={busy} />}
              <Btn small kind="danger" label="Retirar o acesso" onPress={() => open("demote")} />
            </View>
          </>
        ) : (
          <Text style={[u.muted, { marginTop: 8 }]}>Esta é a sua conta. Para mudar o seu nível ou retirar o seu acesso, peça a outro Super administrador.</Text>
        )}

        {canSecurity ? (
          <>
            <SubTitle>Segurança desta conta</SubTitle>
            <View style={u.row}>
              {locked ? <Btn small label="🔓 Desbloquear o acesso" onPress={() => run(() => unlockBoAdmin(userId), "Não foi possível desbloquear.", "O acesso foi desbloqueado.")} disabled={busy} /> : null}
              {!isMe && profile?.twoFactorEnabled ? (
                <Btn
                  small
                  kind="outline"
                  label="Repor o 2FA"
                  onPress={() => confirmSecurity("Repor o 2FA", `${user.name} perde a autenticação de dois fatores e as sessões terminam. Tem de a ativar de novo. Use se perdeu o telemóvel.`, () => resetBoTwoFactor(userId), "Não foi possível repor.", "O 2FA foi reposto.")}
                  disabled={busy}
                />
              ) : null}
              <Btn
                small
                kind="outline"
                label="Terminar todas as sessões"
                onPress={() => confirmSecurity("Terminar as sessões", `Todas as sessões abertas de ${user.name} terminam.`, () => revokeBoSessionsOf(userId), "Não foi possível terminar as sessões.", "As sessões terminaram.")}
                disabled={busy}
              />
            </View>
          </>
        ) : null}

        {panel === "edit" ? (
          <Card>
            <Text style={u.strong}>Nível e permissões</Text>
            <ChipGroup label="Nível" options={catalog.levels.map((l: any) => ({ value: l.value, label: l.label, icon: l.icon }))} value={level} onChange={changeLevel} />
            {level !== d.level ? <Text style={{ color: "#EF6C00" }}>Ao mudar o nível, as permissões extra e retiradas voltam ao início.</Text> : null}
            <Field label="Função (opcional)" value={title} onChangeText={setTitle} placeholder="Ex: Responsável pelo suporte" />

            <Text style={[u.label, { marginTop: 8 }]}>Permissões</Text>
            {level === "SUPER_ADMIN" ? (
              <Text style={u.muted}>O Super administrador tem todas as permissões.</Text>
            ) : (
              <>
                <Text style={u.muted}>Toque para ligar ou desligar. As de "gerir a equipa" e "gerir a segurança" só existem no Super administrador.</Text>
                {grouped.map((g) => (
                  <View key={g.group} style={{ marginTop: 8 }}>
                    <Text style={u.strong}>{g.group}</Text>
                    <View style={u.row}>
                      {g.items.map((p: any) => {
                        const reserved = (catalog.reservedPermissions ?? []).includes(p.key);
                        return reserved ? null : <Chip key={p.key} label={`${allowed(p.key) ? "✅" : "⬜"} ${p.label}`} active={allowed(p.key)} onPress={() => togglePermission(p.key)} />;
                      })}
                    </View>
                  </View>
                ))}
              </>
            )}
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Guardar"} onPress={saveEdit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "suspend" ? (
          <Card>
            <Text style={u.strong}>Suspender o acesso de administrador</Text>
            <Text style={u.muted}>As sessões abertas terminam. A pessoa mantém a conta, mas não entra na administração.</Text>
            <Field label="Motivo (a pessoa vê)" value={note} onChangeText={setNote} multiline />
            <View style={u.row}>
              <Btn kind="danger" label={busy ? "A guardar..." : "Suspender"} onPress={suspend} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "demote" ? (
          <Card>
            <Text style={u.strong}>Retirar o acesso de administrador</Text>
            {profile?.previousRole ? (
              <Text style={u.muted}>A conta volta a ser: {labelOf(catalog.roles, profile.previousRole) || profile.previousRole}.</Text>
            ) : (
              <ChipGroup label="Para que perfil volta a conta?" options={catalog.roles} value={role} onChange={setRole} />
            )}
            <View style={u.row}>
              <Btn kind="danger" label={busy ? "A guardar..." : "Retirar o acesso"} onPress={demote} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>O que pode fazer ({effective.length})</SubTitle>
        <Card>
          {grouped.map((g) => {
            const mine = g.items.filter((p: any) => effective.includes(p.key));
            if (mine.length === 0) return null;
            return (
              <View key={g.group} style={{ marginTop: 4 }}>
                <Text style={u.strong}>{g.group}</Text>
                {mine.map((p: any) => (
                  <Text key={p.key} style={u.muted}>
                    ✓ {p.label}
                  </Text>
                ))}
              </View>
            );
          })}
        </Card>

        <SubTitle>Sessões recentes</SubTitle>
        {d.sessions.length === 0 ? (
          <Text style={u.muted}>Sem sessões.</Text>
        ) : (
          d.sessions.map((s: any) => (
            <Card key={s.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{deviceText(s.userAgent)}</Text>
                <Badge label={s.active ? "Aberta" : "Terminada"} color={s.active ? "#2E7D32" : "#757575"} />
              </View>
              <Text style={u.muted}>
                {s.ip ? `${s.ip} · ` : ""}
                {formatDateTime(s.createdAt)}
              </Text>
            </Card>
          ))
        )}

        <SubTitle>Alertas de segurança</SubTitle>
        {d.events.length === 0 ? (
          <Text style={u.muted}>Sem eventos.</Text>
        ) : (
          d.events.slice(0, 10).map((e: any) => (
            <Card key={e.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.securityEventKinds, e.kind) || e.kind}</Text>
                {e.severity === "ALERTA" ? <Badge label="Alerta" color="#EF6C00" /> : null}
              </View>
              <Text style={{ marginTop: 2 }}>{e.message}</Text>
              <Text style={u.muted}>{formatDateTime(e.createdAt)}</Text>
            </Card>
          ))
        )}

        <SubTitle>Histórico de alterações</SubTitle>
        {d.audit.length === 0 ? (
          <Text style={u.muted}>Sem atividade registada.</Text>
        ) : (
          d.audit.slice(0, 10).map((a: any) => (
            <Card key={a.id}>
              <Text style={u.strong}>{labelOf(catalog.auditActions, a.action) || a.action}</Text>
              <Text style={{ marginTop: 2 }}>{a.summary}</Text>
              <Text style={u.muted}>{formatDateTime(a.createdAt)}</Text>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
