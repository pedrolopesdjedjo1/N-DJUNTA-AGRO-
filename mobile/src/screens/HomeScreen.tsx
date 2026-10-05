import { ScrollView, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

const DASHBOARD_ROLES = ["ADMIN", "GOVERNO", "ONG"];

// Área de cada perfil: [perfil, nome da tela, texto do botão]
const AREAS: [string, string, string][] = [
  ["AGRICULTOR", "Agricultor", "🌾 Área do Agricultor"],
  ["PESCADOR", "Pescador", "🎣 Área do Pescador"],
  ["COMPRADOR", "Comprador", "🛒 Área do Comprador"],
  ["COMERCIANTE", "Comerciante", "🧺 Área da Comerciante"],
  ["AGENTE", "Agente", "👨‍💼 Área do Agente Digital"],
  ["TRANSPORTADOR", "Transportador", "🚚 Área do Transportador"],
  ["GOVERNO", "Governo", "🏛️ Painel do Governo"],
  ["ONG", "Ong", "🌍 Painel ONU / ONG"],
];

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const role = String(user?.role ?? "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const canSeeDashboard = DASHBOARD_ROLES.includes(role);

  // O ADMIN vê todas as áreas (para testar). Os outros veem só a sua.
  const minhasAreas = AREAS.filter(([perfil]) => isAdmin || perfil === role);

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

      {minhasAreas.map(([perfil, tela, texto]) => (
        <TouchableOpacity
          key={perfil}
          style={styles.areaButton}
          onPress={() => navigation.navigate(tela)}
        >
          <Text style={styles.buttonText}>{texto}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Products")}
      >
        <Text style={styles.buttonText}>{t("products")}</Text>
      </TouchableOpacity>

      {(role === "COMPRADOR" || role === "COMERCIANTE" || isAdmin) && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("BuscaAvancada")}
        >
          <Text style={styles.buttonText}>🔎 Procurar produtos</Text>
        </TouchableOpacity>
      )}

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

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Ferramentas")}>
        <Text style={styles.buttonText}>🧰 Ferramentas e emergência</Text>
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

      {isAdmin && (
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
  areaButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.black,
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
