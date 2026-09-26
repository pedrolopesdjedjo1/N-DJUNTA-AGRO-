import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </Text>
      </View>

      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.role}>{user?.role}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, alignItems: "center" },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.primary, justifyContent: "center", alignItems: "center",
    marginTop: 30, marginBottom: 12,
  },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: "bold" },
  name: { fontSize: 20, fontWeight: "bold", color: colors.text },
  role: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, textTransform: "capitalize" },
  infoBox: {
    width: "100%", backgroundColor: colors.surface, borderRadius: 10,
    padding: 16, marginBottom: 30, borderWidth: 1, borderColor: colors.border,
  },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: colors.text },
  logoutButton: {
    width: "100%", backgroundColor: colors.error, borderRadius: 10,
    paddingVertical: 14, alignItems: "center",
  },
  logoutText: { color: colors.white, fontWeight: "bold", fontSize: 16 },
});
