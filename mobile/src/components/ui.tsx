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
      refreshControl={
        loader ? <RefreshControl refreshing={loader.refreshing} onRefresh={loader.onRefresh} /> : undefined
      }
    >
      {loader && loader.error ? <Text style={u.error}>{loader.error}</Text> : null}
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={u.title}>{children}</Text>;
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
  kind?: "primary" | "outline" | "danger";
  small?: boolean;
  disabled?: boolean;
}) {
  const bg = kind === "primary" ? colors.primary : "transparent";
  const border = kind === "danger" ? "#B71C1C" : colors.primary;
  const color = kind === "primary" ? colors.white : kind === "danger" ? "#B71C1C" : colors.primary;
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[u.btn, small && u.btnSmall, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[u.btnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[u.chip, active && u.chipActive]} onPress={onPress}>
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
        placeholderTextColor={colors.textSecondary}
        style={[u.input, props.multiline && u.multiline, style]}
        {...props}
      />
    </View>
  );
}

export const u = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  error: { color: "#B71C1C", textAlign: "center", marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "bold", color: colors.primary, marginBottom: 12 },
  sub: { fontSize: 16, fontWeight: "bold", color: colors.text, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  btn: { borderRadius: 8, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, marginRight: 8, marginTop: 8 },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnText: { fontSize: 14, fontWeight: "600" },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 30, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tile: { width: "50%", padding: 4 },
  tileBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.surface },
  tileValue: { fontSize: 18, fontWeight: "bold", color: colors.primary },
  tileLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  muted: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  strong: { color: colors.text, fontWeight: "bold", fontSize: 15 },
  photo: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#eee", marginRight: 10 },
});
