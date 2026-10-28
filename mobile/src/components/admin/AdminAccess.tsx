import React, { useState } from "react";
import { Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { Page, Title, Card, Btn, Field, u } from "../ui";
import TwoFactorSetup from "./TwoFactorSetup";
import { boSessionStart } from "../../api/backoffice";
import { setAdminSession } from "../../utils/adminSession";
import { getApiErrorMessage } from "../../api/errorMessage";

// Aparece no lugar da tela quando a administração pede o código, o 2FA ou nega o acesso
export default function AdminAccess({ reason }: { reason: string }) {
  const { logout } = useAuth();
  const navigation = useNavigation<any>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm(value?: string) {
    const text = (value ?? code).trim();
    if (!text) {
      Alert.alert("Atenção", "Escreva o código.");
      return;
    }

    setBusy(true);
    try {
      const r = await boSessionStart(text);
      setAdminSession(r.token, r.expiresAt);
      setCode("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível confirmar o acesso."));
    } finally {
      setBusy(false);
    }
  }

  if (reason === "SUSPENDED" || reason === "NOT_ADMIN") {
    return (
      <Page>
        <Title>🛡️ Administração</Title>
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>
            {reason === "SUSPENDED" ? "O seu acesso de administrador está suspenso." : "Esta conta não tem acesso à administração."}
          </Text>
          <Text style={u.muted}>Fale com um Super administrador do NÔDJUNTA AGRO.</Text>
        </Card>
        <Btn kind="outline" label="Voltar" onPress={() => navigation.goBack()} />
        <Btn kind="danger" label="Sair da conta" onPress={logout} />
      </Page>
    );
  }

  if (reason === "SETUP") {
    return (
      <Page>
        <Title>🛡️ Administração</Title>
        <Text style={u.muted}>A plataforma exige a autenticação de dois fatores a todos os administradores. Ative-a para continuar.</Text>
        <TwoFactorSetup onFinished={(c) => confirm(c)} />
        {busy ? <Text style={u.muted}>A abrir a sessão...</Text> : null}
        <Btn kind="outline" label="Agora não" onPress={() => navigation.goBack()} />
      </Page>
    );
  }

  return (
    <Page>
      <Title>🛡️ Administração</Title>
      <Text style={u.muted}>Confirme que é você: escreva o código de 6 números da aplicação de autenticação, ou um código de reserva.</Text>

      <Card>
        <Field
          label="Código"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="123 456"
          onSubmitEditing={() => confirm()}
          returnKeyType="done"
        />
        <Btn label={busy ? "A confirmar..." : "Confirmar"} onPress={() => confirm()} disabled={busy} />
        <Text style={[u.muted, { marginTop: 6 }]}>A sessão dura 8 horas. Depois de 5 códigos errados, o acesso fica bloqueado por alguns minutos.</Text>
      </Card>

      <Btn kind="outline" label="Voltar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
