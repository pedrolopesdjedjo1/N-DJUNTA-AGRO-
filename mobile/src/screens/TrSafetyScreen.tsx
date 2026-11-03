import React from "react";
import { Text } from "react-native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Btn, useLoader, u } from "../components/ui";
import { getTrSafetyTips } from "../api/transporterV2";

const EMPTY = { general: [] as string[], vehicle: [] as string[], cargo: [] as string[] };

function block(title: string, tips: string[]) {
  if (tips.length === 0) return null;
  return (
    <>
      <SubTitle>{title}</SubTitle>
      <Card>
        {tips.map((t, i) => (
          <Text key={`${i}-${t}`} style={{ marginTop: i === 0 ? 0 : 8, lineHeight: 20 }}>
            • {t}
          </Text>
        ))}
      </Card>
    </>
  );
}

// Dicas de segurança, ajustadas ao veículo e aos produtos que o transportador leva
export default function TrSafetyScreen({ navigation }: any) {
  const loader = useLoader(getTrSafetyTips, EMPTY);
  const d: any = loader.data;

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>🦺 Dicas de segurança</Title>
        <Text style={u.muted}>Para viajar em segurança e proteger a carga. As dicas mudam conforme o seu veículo e os produtos que transporta.</Text>

        {block("Antes e durante a viagem", d.general)}
        {block("Para o seu veículo", d.vehicle)}
        {block("Para a sua carga", d.cargo)}

        <SubTitle>Se precisar de ajuda</SubTitle>
        <Btn label="🆘 Emergência e assistência" onPress={() => navigation.navigate("TrEmergency")} />
        <Btn kind="outline" label="⛽ Postos e oficinas" onPress={() => navigation.navigate("TrServices")} />
      </Page>
    </TrLayout>
  );
}
