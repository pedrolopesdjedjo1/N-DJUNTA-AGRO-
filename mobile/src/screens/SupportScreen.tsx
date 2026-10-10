import React from "react";
import { Text, Linking } from "react-native";
import { Page, Title, Card, Btn, u } from "../components/ui";
import { SUPPORT } from "../constants/market";

export default function SupportScreen() {
  return (
    <Page>
      <Title>🆘 Suporte NÔDJUNTA AGRO</Title>

      {SUPPORT.phones.map((phone) => (
        <Card key={phone}>
          <Text style={u.strong}>📞 {phone}</Text>
          <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${phone}`)} />
          <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/245${phone}`)} />
        </Card>
      ))}

      <Card>
        <Text style={u.strong}>📧 {SUPPORT.email}</Text>
        <Btn small label="Enviar e-mail" onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`)} />
      </Card>
    </Page>
  );
}
