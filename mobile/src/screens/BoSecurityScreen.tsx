import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import TwoFactorSetup from "../components/admin/TwoFactorSetup";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getBoSecurity, boTwoFactorDisable, revokeBoSession, boSessionEnd } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan, clearAdminSession, setAdminBlocked } from "../utils/adminSession";
import { SEVERITY_BO_COLOR, deviceText } from "../constants/backoffice";
import { labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const EMPTY = {
  level: "",
  legacy: false,
  twoFactorEnabled: false,
  setupStarted: false,
  backupCodesLeft: 0,
  require2fa: false,
  lockedUntil: null as any,
  lastLoginAt: null as any,
  sessions: [] as any[],
  events: [] as any[],
};

export default function BoSecurityScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const loader = useLoader(getBoSecurity, EMPTY);
  const d: any = loader.data;

  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function disable() {
    if (!code.trim()) {
      Alert.alert("Atenção", "Escreva um código da aplicação de autenticação.");
      return;
    }
    setBusy(true);
    try {
      await boTwoFactorDisable(code.trim());
      setCode("");
      setDisabling(false);
      loader.reload();
      Alert.alert("Pronto", "A autenticação de dois fatores foi desativada.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível desativar."));
    } finally {
      setBusy(false);
    }
  }

  function revoke(s: any) {
    Alert.alert("Terminar sessão", `Terminar a sessão aberta em: ${deviceText(s.userAgent)}?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Terminar",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeBoSession(s.id);
            if (s.isCurrent) {
              clearAdminSession();
              setAdminBlocked(d.twoFactorEnabled ? "SESSION" : "");
            }
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível terminar a sessão."));
          }
        },
      },
    ]);
  }

  async function endMine() {
    try {
      await boSessionEnd();
    } catch (e) {
      // termina sozinha
    }
    clearAdminSession();
    if (d.twoFactorEnabled) setAdminBlocked("SESSION");
    else loader.reload();
  }

  const active = (d.sessions as any[]).filter((s) => s.active);
  const past = (d.sessions as any[]).filter((s) => !s.active).slice(0, 5);

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>🔐 A minha segurança</Title>

        {d.lockedUntil ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>🔒 O acesso está bloqueado até {formatDateTime(d.lockedUntil)}</Text>
            <Text style={u.muted}>Foi bloqueado por códigos errados. Um Super administrador pode desbloquear mais cedo.</Text>
          </Card>
        ) : null}

        <SubTitle>Autenticação de dois fatores</SubTitle>
        {d.twoFactorEnabled ? (
          <Card>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>✅ Ativa</Text>
              <Badge label={`${d.backupCodesLeft} código(s) de reserva`} color={d.backupCodesLeft <= 2 ? "#C62828" : "#2E7D32"} />
            </View>
            {d.backupCodesLeft <= 2 ? (
              <Text style={{ color: "#EF6C00", marginTop: 4 }}>
                ⚠️ Restam poucos códigos de reserva. Desative e ative de novo o 2FA para receber códigos novos.
              </Text>
            ) : null}
            {d.require2fa ? <Text style={[u.muted, { marginTop: 4 }]}>A plataforma exige o 2FA a todos os administradores: não pode ser desativado.</Text> : null}

            {!d.require2fa ? (
              <>
                <Btn small kind="outline" label={disabling ? "Cancelar" : "Desativar o 2FA"} onPress={() => { setDisabling(!disabling); setCode(""); }} />
                {disabling ? (
                  <View style={{ marginTop: 6 }}>
                    <Field label="Código atual" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="123 456" />
                    <Btn kind="danger" label={busy ? "A desativar..." : "Confirmar desativação"} onPress={disable} disabled={busy} />
                  </View>
                ) : null}
              </>
            ) : null}
          </Card>
        ) : (
          <>
            <Card>
              <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ Desativada</Text>
              <Text style={u.muted}>
                {d.require2fa
                  ? "A plataforma exige o 2FA. Ative-o para continuar a usar a administração."
                  : "Recomendamos ativar: protege a plataforma se perder o telemóvel ou a palavra-passe."}
              </Text>
            </Card>
            <TwoFactorSetup onFinished={() => loader.reload()} />
          </>
        )}

        <SubTitle>Sessões de administrador ({active.length})</SubTitle>
        {active.length === 0 ? (
          <Text style={u.muted}>Não há sessões abertas.</Text>
        ) : (
          active.map((s) => (
            <Card key={s.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{deviceText(s.userAgent)}</Text>
                {s.isCurrent ? <Badge label="Esta sessão" color="#2E7D32" /> : null}
              </View>
              <Text style={u.muted}>
                {s.ip ? `${s.ip} · ` : ""}
                {s.method === "SEM_2FA" ? "sem 2FA" : s.method === "2FA" ? "com 2FA" : "código de reserva"}
              </Text>
              <Text style={u.muted}>
                Aberta {formatDateTime(s.createdAt)} · termina {formatDateTime(s.expiresAt)}
              </Text>
              <Btn small kind="danger" label={s.isCurrent ? "Terminar esta sessão" : "Terminar"} onPress={() => (s.isCurrent ? endMine() : revoke(s))} />
            </Card>
          ))
        )}
        {past.length > 0 ? <Text style={[u.muted, { marginTop: 6 }]}>Anteriores: {past.map((s) => formatDateTime(s.createdAt)).join(" · ")}</Text> : null}

        <SubTitle>Eventos de segurança</SubTitle>
        {d.events.length === 0 ? (
          <Empty text="Ainda não há eventos." />
        ) : (
          d.events.map((e: any) => (
            <Card key={e.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.securityEventKinds, e.kind) || e.kind}</Text>
                <Badge label={e.severity === "ALERTA" ? "Alerta" : "Info"} color={SEVERITY_BO_COLOR[e.severity === "ALERTA" ? "ALERTA" : "INFO"]} />
              </View>
              <Text style={{ marginTop: 2 }}>{e.message}</Text>
              <Text style={u.muted}>
                {e.ip ? `${e.ip} · ` : ""}
                {formatDateTime(e.createdAt)}
              </Text>
            </Card>
          ))
        )}

        <View style={u.row}>
          <Btn small kind="outline" label="🧾 O meu registo de atividades" onPress={() => navigation.navigate("BoAudit")} />
          {adminCan("security.view", "team.manage") ? <Btn small kind="outline" label="🔎 Segurança de toda a equipa" onPress={() => navigation.navigate("BoAudit", { all: true })} /> : null}
        </View>
      </Page>
    </AdminLayout>
  );
}
