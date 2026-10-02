import { ScrollView, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

const DASHBOARD_ROLES = ["ADMIN", "GOVERNO", "ONG"];

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const canSeeDashboard = DASHBOARD_ROLES.includes(String(user?.role ?? ""));

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        {t("welcome")}, {user?.name}!
      </Text>
      <Text style={styles.subtitle}>
        {t("roleLabel")}: {user?.role}
      </Text>
      <Text style={styles.info}>{t("homeInfo")}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Products")}
      >
        <Text style={styles.buttonText}>{t("products")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Profile")}>
        <Text style={styles.buttonText}>{t("profile")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Conversations")}>
        <Text style={styles.buttonText}>{t("messages")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Notifications")}>
        <Text style={styles.buttonText}>{t("notifications")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("MarketPrices")}>
        <Text style={styles.buttonText}>{t("marketPrices")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("WeatherAlerts")}>
        <Text style={styles.buttonText}>{t("weather")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Transport")}>
        <Text style={styles.buttonText}>{t("transport")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Cooperatives")}>
        <Text style={styles.buttonText}>{t("cooperatives")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Verification")}>
        <Text style={styles.buttonText}>✅ {t("verification")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Language")}>
        <Text style={styles.buttonText}>🌐 {t("language")}</Text>
      </TouchableOpacity>

      {canSeeDashboard && (
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Dashboard")}>
          <Text style={styles.buttonText}>📊 {t("dashboard")}</Text>
        </TouchableOpacity>
      )}

      {user?.role === "ADMIN" && (
        <>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Admin")}>
            <Text style={styles.buttonText}>{t("admin")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("AdminVerifications")}
          >
            <Text style={styles.buttonText}>{t("verifications")}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>{t("logout")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: colors.black,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
