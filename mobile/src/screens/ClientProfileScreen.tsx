import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { ClientLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Field, useLoader, u } from "../components/ui";
import { getClientProfile, updateClientProfile } from "../api/shop";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

export default function ClientProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const loader = useLoader(getClientProfile, null as any);
  const p: any = loader.data;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (p?.user?.name && !editing) setName(p.user.name);
  }, [p?.user?.name]);

  // Atualiza os números quando volta de outra tela
  useFocusEffect(
    React.useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function saveName() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o seu nome.");
      return;
    }
    setSaving(true);
    try {
      loader.setData(await updateClientProfile({ name: name.trim() }));
      setEditing(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o nome."));
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto() {
    const picked = await pickImage(false, [1, 1]);
    if (!picked) return;
    try {
      const photoUrl = await uploadImageBase64(picked.base64, "perfil-");
      loader.setData(await updateClientProfile({ photoUrl }));
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível mudar a foto."));
    }
  }

  if (!p) {
    return (
      <ClientLayout active="ClientProfile">
        <Page loader={loader}>
          <Title>👤 Meu perfil</Title>
        </Page>
      </ClientLayout>
    );
  }

  const s = p.stats;
  const tiles = [
    ["📦 Encomendas", String(s.orders)],
    ["🚚 Em curso", String(s.currentOrders)],
    ["❤️ Favoritos", String(s.favoriteProducts + s.favoriteSellers)],
    ["⭐ Avaliações", String(s.reviewsGiven)],
  ];

  const menu: [string, string, string, string?][] = [
    ["📍", "Endereços", "ClientAddresses", p.defaultAddress ? p.defaultAddress.address : "Adicionar endereço"],
    ["📦", "Minhas encomendas", "ClientOrders", `${s.currentOrders} em curso`],
    ["❤️", "Favoritos", "ClientFavorites", `${s.favoriteProducts} produtos · ${s.favoriteSellers} vendedores`],
    ["⭐", "Minhas avaliações", "ClientMyReviews", `${s.reviewsGiven} avaliação(ões)`],
    ["💳", "Métodos de pagamento", "ClientPaymentMethods", p.defaultPaymentMethod ? p.defaultPaymentMethod.label : "Adicionar método"],
    ["🧾", "Pagamentos e recibos", "ClientPayments"],
    ["🔔", "Notificações", "Notifications", s.unreadNotifications > 0 ? `${s.unreadNotifications} por ler` : undefined],
    ["💬", "Mensagens", "Conversations"],
    ["⚙️", "Configurações", "Settings", "Senha, telefone e avisos"],
    ["🆘", "Suporte", "ClientSupport"],
    ["🌐", "Idioma", "Language"],
    ["✅", "Verificação", "Verification"],
  ];

  return (
    <ClientLayout active="ClientProfile">
      <Page loader={loader}>
        <Title>👤 Meu perfil</Title>

        <View style={u.row}>
          {p.user.photoUrl ? (
            <Image source={{ uri: p.user.photoUrl }} style={[u.photo, { width: 90, height: 90, borderRadius: 45 }]} />
          ) : (
            <View style={[u.photo, { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 36 }}>👤</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>{p.user.name}</Text>
            <Text style={u.muted}>📞 {p.user.phone || "—"}</Text>
            <Text style={u.muted}>No app desde {formatDate(p.user.createdAt)}</Text>
            <View style={{ marginTop: 4 }}>
              <Badge label={p.user.isVerified ? "Conta verificada ✅" : "Ainda não verificado"} color={p.user.isVerified ? "#2E7D32" : "#757575"} />
            </View>
          </View>
        </View>

        <View style={u.row}>
          <Btn small kind="outline" label="Mudar foto" onPress={changePhoto} />
          <Btn small kind="outline" label={editing ? "Fechar" : "✏️ Mudar nome"} onPress={() => setEditing(!editing)} />
        </View>

        {editing ? (
          <Card>
            <Field label="Nome" value={name} onChangeText={setName} />
            <Btn label={saving ? "A guardar..." : "Guardar nome"} onPress={saveName} disabled={saving} />
          </Card>
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>O telefone e a senha mudam-se em Configurações.</Text>

        <View style={u.grid}>
          {tiles.map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <SubTitle>A minha conta</SubTitle>
        {menu.map(([icon, label, route, hint]) => (
          <Card key={route}>
            <View style={u.between}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={u.strong}>
                  {icon} {label}
                </Text>
                {hint ? (
                  <Text style={u.muted} numberOfLines={1}>
                    {hint}
                  </Text>
                ) : null}
              </View>
              <Btn small kind="outline" label="Abrir" onPress={() => navigation.navigate(route)} />
            </View>
          </Card>
        ))}

        <Btn kind="danger" label="Sair da conta" onPress={logout} />
      </Page>
    </ClientLayout>
  );
}
