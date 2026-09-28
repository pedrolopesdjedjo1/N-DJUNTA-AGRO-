import { ScrollView, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Bem-vindo, {user?.name}!</Text>
      <Text style={styles.subtitle}>Perfil: {user?.role}</Text>
      <Text style={styles.info}>
        Esta e a tela inicial. Explore os produtos disponiveis no mercado.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Products")}
      >
        <Text style={styles.buttonText}>Ver Produtos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Profile")}>
        <Text style={styles.buttonText}>Meu Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Conversations")}>
        <Text style={styles.buttonText}>Mensagens</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Notifications")}>
        <Text style={styles.buttonText}>Notificacoes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("MarketPrices")}>
        <Text style={styles.buttonText}>Preços de Mercado</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("WeatherAlerts")}>
        <Text style={styles.buttonText}>Clima e Alertas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Transport")}>
        <Text style={styles.buttonText}>Transporte</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Cooperatives")}>
      <Text style={styles.buttonText}>Cooperativas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Sair</Text>
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
