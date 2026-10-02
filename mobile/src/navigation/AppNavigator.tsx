import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import AddProductScreen from "../screens/AddProductScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ConversationsScreen from "../screens/ConversationsScreen";
import ChatScreen from "../screens/ChatScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import MarketPricesScreen from "../screens/MarketPricesScreen";
import WeatherAlertsScreen from "../screens/WeatherAlertsScreen";
import TransportScreen from "../screens/TransportScreen";
import CooperativesScreen from "../screens/CooperativesScreen";
import ReviewsScreen from "../screens/ReviewsScreen";
import AdminScreen from "../screens/AdminScreen";
import AdminReportsScreen from "../screens/AdminReportsScreen";
import LanguageScreen from "../screens/LanguageScreen";
import VerificationScreen from "../screens/VerificationScreen";
import AdminVerificationsScreen from "../screens/AdminVerificationsScreen";
import DashboardScreen from "../screens/DashboardScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Products"
              component={ProductsScreen}
              options={{ headerShown: true, title: "Produtos" }}
            />
            <Stack.Screen
              name="AddProduct"
              component={AddProductScreen}
              options={{ headerShown: true, title: "Cadastrar Produto" }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: true, title: t("profile") }}
            />
            <Stack.Screen
              name="Conversations"
              component={ConversationsScreen}
              options={{ headerShown: true, title: t("messages") }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }: any) => ({
                headerShown: true,
                title: route.params?.userName ?? "Chat",
              })}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: true, title: t("notifications") }}
            />
            <Stack.Screen
              name="MarketPrices"
              component={MarketPricesScreen}
              options={{ headerShown: true, title: t("marketPrices") }}
            />
            <Stack.Screen
              name="WeatherAlerts"
              component={WeatherAlertsScreen}
              options={{ headerShown: true, title: t("weather") }}
            />
            <Stack.Screen
              name="Transport"
              component={TransportScreen}
              options={{ headerShown: true, title: t("transport") }}
            />
            <Stack.Screen
              name="Cooperatives"
              component={CooperativesScreen}
              options={{ headerShown: true, title: t("cooperatives") }}
            />
            <Stack.Screen
              name="Reviews"
              component={ReviewsScreen}
              options={{ headerShown: true, title: "Avaliações" }}
            />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ headerShown: true, title: t("admin") }}
            />
            <Stack.Screen
              name="AdminReports"
              component={AdminReportsScreen}
              options={{ headerShown: true, title: "Denúncias" }}
            />
            <Stack.Screen
              name="Language"
              component={LanguageScreen}
              options={{ headerShown: true, title: t("language") }}
            />
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              options={{ headerShown: true, title: t("verification") }}
            />
            <Stack.Screen
              name="AdminVerifications"
              component={AdminVerificationsScreen}
              options={{ headerShown: true, title: t("verifications") }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: true, title: t("dashboard") }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background ?? "#fff",
  },
});
