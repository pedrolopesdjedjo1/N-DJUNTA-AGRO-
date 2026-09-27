import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
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
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

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
