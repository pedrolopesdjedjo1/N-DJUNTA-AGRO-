import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { getApiErrorMessage } from "../api/errorMessage";

// Cores da marca NÔ DJUNTA (com valores de segurança caso o tema seja antigo)
const GOLD: string = (colors as any).gold ?? "#E3A81B";
const GREEN_SOFT: string = (colors as any).primarySoft ?? "#E3F1E7";
const DANGER: string = colors.error ?? "#C8402F";

export function useLoader<T>(load: () => Promise<T>, initial: T, deps: any[] = []) {
  const ref = useRef(load);
  ref.current = load;
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setError("");
      setData(await ref.current());
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, ...deps])
  );

  const onRefresh = () => {
    setRefreshing(true);
    reload();
  };

  return { data, setData, loading, refreshing, error, reload, onRefresh };
}

type LoaderLike = { loading: boolean; refreshing: boolean; error: string; onRefresh: () => void };

export function Page({ loader, children }: { loader?: LoaderLike; children: React.ReactNode }) {
  if (loader && loader.loading) {
    return (
      <View style={u.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <ScrollView
      style={u.page}
      contentContainerStyle={u.pageContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        loader ? (
          <RefreshControl
            refreshing={loader.refreshing}
            onRefresh={loader.onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {loader && loader.error ? <Text style={u.error}>{loader.error}</Text> : null}
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <Text style={u.title}>{children}</Text>
      <View style={u.titleLine} />
    </View>
  );
}

export function SubTitle({ children }: { children: React.ReactNode }) {
  return <Text style={u.sub}>{children}</Text>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={u.card}>{children}</View>;
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[u.badge, { backgroundColor: color }]}>
      <Text style={u.badgeText}>{label}</Text>
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = "primary",
  small,
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "outline" | "danger" | "gold";
  small?: boolean;
  disabled?: boolean;
}) {
  const bg = kind === "primary" ? colors.primary : kind === "gold" ? GOLD : "transparent";
  const border = kind === "danger" ? DANGER : kind === "gold" ? GOLD : colors.primary;
  const color =
    kind === "primary" ? colors.white : kind === "danger" ? DANGER : kind === "gold" ? colors.black : colors.primary;
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[u.btn, small && u.btnSmall, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[u.btnText, small && u.btnTextSmall, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[u.chip, active && u.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[u.chipText, active && u.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={u.empty}>{text}</Text>;
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View>
      {label ? <Text style={u.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#8A8D86"
        style={[u.input, props.multiline && u.multiline, style]}
        {...props}
      />
    </View>
  );
}

const sombra = {
  shadowColor: "#000",
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const u = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  error: { color: DANGER, textAlign: "center", marginBottom: 10, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "900", color: colors.primary, marginBottom: 6 },
  titleLine: { height: 3, width: 56, borderRadius: 2, backgroundColor: GOLD, marginBottom: 14 },
  sub: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 20, marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surface,
    ...sombra,
  },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 14, paddingVertical: 4, paddingHorizontal: 11 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  btn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginRight: 8,
    marginTop: 8,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, borderRadius: 12 },
  btnText: { fontSize: 15, fontWeight: "800" },
  btnTextSmall: { fontSize: 14 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: colors.white, fontWeight: "800" },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 30, marginBottom: 20, fontSize: 14 },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tile: { width: "50%", padding: 4 },
  tileBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.surface,
    ...sombra,
  },
  tileValue: { fontSize: 20, fontWeight: "900", color: colors.primary },
  tileLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 3, fontWeight: "600" },
  muted: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  strong: { color: colors.text, fontWeight: "800", fontSize: 15 },
  photo: { width: 64, height: 64, borderRadius: 12, backgroundColor: GREEN_SOFT, marginRight: 10 },
});
