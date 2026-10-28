import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Page, Title, Btn, Empty, u } from "../ui";
import AdminAccess from "./AdminAccess";
import { ADMIN_TABS } from "../../constants/backoffice";
import { getAdminMeCache, loadAdminMe, useAdminSession } from "../../utils/adminSession";
import { getApiErrorMessage } from "../../api/errorMessage";
import { colors } from "../../theme/colors";

function AdminTabBar({ active, me }: { active: string; me: any }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const perms: string[] = me?.permissions ?? [];
  const tabs = ADMIN_TABS.filter((t) => t.perms.length === 0 || t.perms.some((p) => perms.includes(p)));

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFFFFF", paddingBottom: insets.bottom }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.8}
              onPress={() => (on ? null : navigation.navigate(t.key))}
              style={{ minWidth: 74, alignItems: "center", paddingVertical: 7, paddingHorizontal: 6 }}
            >
              <Text style={{ fontSize: 20, opacity: on ? 1 : 0.55 }}>{t.icon}</Text>
              <Text style={{ fontSize: 10, marginTop: 1, fontWeight: on ? "bold" : "normal", color: on ? colors.primary : colors.textSecondary }} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Envolve todas as telas da administração: verifica o acesso, pede o código quando falta e põe a barra de abas
export default function AdminLayout({ active, children }: { active: string; children: React.ReactNode }) {
  const { blocked } = useAdminSession();
  const [me, setMe] = useState<any>(getAdminMeCache());
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (blocked || me) return;

    let alive = true;
    loadAdminMe()
      .then((m) => {
        if (alive) setMe(m);
      })
      .catch((e) => {
        if (alive) setError(getApiErrorMessage(e, "Não foi possível verificar o seu acesso."));
      });

    return () => {
      alive = false;
    };
  }, [blocked, me, tick]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {blocked ? (
          <AdminAccess reason={blocked} />
        ) : me ? (
          children
        ) : (
          <Page>
            <Title>🛡️ Administração</Title>
            {error ? (
              <>
                <Empty text={error} />
                <Btn
                  label="Tentar de novo"
                  onPress={() => {
                    setError("");
                    setTick((n) => n + 1);
                  }}
                />
              </>
            ) : (
              <Text style={u.muted}>A verificar o seu acesso...</Text>
            )}
          </Page>
        )}
      </View>
      {me && !blocked ? <AdminTabBar active={active} me={me} /> : null}
    </View>
  );
}
