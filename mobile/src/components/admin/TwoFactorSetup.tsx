import React, { useState } from "react";
import { View, Text, Alert, Linking, Share } from "react-native";
import { Card, Btn, Field, u } from "../ui";
import { boTwoFactorSetup, boTwoFactorEnable } from "../../api/backoffice";
import { getApiErrorMessage } from "../../api/errorMessage";
import { colors } from "../../theme/colors";

interface Props {
  // Chamado no fim, com o último código usado (serve para abrir a sessão de administrador)
  onFinished: (code: string) => void;
}

type Step = "intro" | "scan" | "codes";

// Ativar a autenticação de dois fatores em 3 passos: chave, código, códigos de reserva
export default function TwoFactorSetup({ onFinished }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [secret, setSecret] = useState("");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    try {
      const r = await boTwoFactorSetup();
      setSecret(r.secret);
      setUrl(r.otpauthUrl);
      setStep("scan");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível gerar a chave."));
    } finally {
      setBusy(false);
    }
  }

  async function openApp() {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Não foi possível abrir", "Instale o Google Authenticator, o Microsoft Authenticator ou o Authy e escreva a chave à mão.");
    }
  }

  async function enable() {
    if (code.replace(/\s/g, "").length !== 6) {
      Alert.alert("Atenção", "Escreva o código de 6 números que aparece na aplicação.");
      return;
    }
    setBusy(true);
    try {
      const r = await boTwoFactorEnable(code.trim());
      setBackup(r.backupCodes);
      setStep("codes");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Código inválido. Confira a hora do telemóvel e tente de novo."));
    } finally {
      setBusy(false);
    }
  }

  async function shareCodes() {
    try {
      await Share.share({ message: `Códigos de reserva do NÔDJUNTA AGRO (cada um só serve uma vez):\n${backup.join("\n")}` });
    } catch (e) {
      // se não partilhar, os códigos continuam no ecrã
    }
  }

  if (step === "intro") {
    return (
      <Card>
        <Text style={u.strong}>🔐 Proteja a sua conta de administrador</Text>
        <Text style={[u.muted, { marginTop: 4 }]}>
          Além da palavra-passe, passa a precisar de um código de 6 números que muda de 30 em 30 segundos. Funciona com o Google Authenticator, o Microsoft Authenticator ou o Authy.
        </Text>
        <Btn label={busy ? "A preparar..." : "Começar"} onPress={begin} disabled={busy} />
      </Card>
    );
  }

  if (step === "scan") {
    return (
      <Card>
        <Text style={u.strong}>1. Junte a conta na aplicação</Text>
        <Btn small label="📲 Abrir na aplicação de autenticação" onPress={openApp} />
        <Text style={[u.muted, { marginTop: 8 }]}>Se não abrir, escolha "adicionar conta" na aplicação e escreva esta chave:</Text>
        <Text selectable style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1, marginTop: 6, color: colors.primary }}>
          {secret.match(/.{1,4}/g)?.join(" ") ?? secret}
        </Text>

        <Text style={[u.strong, { marginTop: 12 }]}>2. Escreva o código que aparece</Text>
        <Field label="Código de 6 números" value={code} onChangeText={(v) => setCode(v.replace(/[^\d\s]/g, "").slice(0, 7))} keyboardType="number-pad" placeholder="123 456" />
        <Btn label={busy ? "A confirmar..." : "Ativar"} onPress={enable} disabled={busy} />
      </Card>
    );
  }

  return (
    <Card>
      <Text style={u.strong}>✅ Ativado. Guarde os códigos de reserva</Text>
      <Text style={[u.muted, { marginTop: 4 }]}>
        Se perder o telemóvel, cada um destes códigos deixa-o entrar uma vez. Só os vê agora: guarde-os num sítio seguro.
      </Text>

      <View style={{ marginTop: 8 }}>
        {backup.map((c) => (
          <Text key={c} selectable style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1, marginTop: 4 }}>
            {c}
          </Text>
        ))}
      </View>

      <View style={u.row}>
        <Btn small kind="outline" label="📤 Guardar ou enviar para mim" onPress={shareCodes} />
        <Btn small kind={saved ? "primary" : "outline"} label={saved ? "✓ Já os guardei" : "Já os guardei"} onPress={() => setSaved(!saved)} />
      </View>
      <Btn label="Continuar" onPress={() => onFinished(code.trim())} disabled={!saved} />
      {!saved ? <Text style={u.muted}>Marque "Já os guardei" para continuar.</Text> : null}
    </Card>
  );
}
