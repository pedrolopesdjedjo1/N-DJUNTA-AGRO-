import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isVerified?: boolean;
}

interface RegisterData {
  name: string;
  email?: string;
  password: string;
  role: string;
  phone?: string;
  location?: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = "@nodjuntaagro:token";
const USER_KEY = "@nodjuntaagro:user";
export const LAST_LOGIN_KEY = "@nodjuntaagro:lastLogin";

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

async function clearStorage() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

async function saveSession(token: string, user: User) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user.phone) {
    await AsyncStorage.setItem(
      LAST_LOGIN_KEY,
      JSON.stringify({ phone: user.phone, name: user.name, role: user.role })
    );
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoredUser() {
      try {
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
        } else {
          await clearStorage();
        }
      } catch (err) {
        await clearStorage();
      } finally {
        setLoading(false);
      }
    }
    loadStoredUser();
  }, []);

  async function login(identifier: string, password: string) {
    const value = identifier.trim();
    const body = value.includes("@") ? { email: value, password } : { phone: value, password };
    const response = await api.post("/api/auth/login", body);
    const { token, user: loggedUser } = response.data;
    await saveSession(token, loggedUser);
    setUser(loggedUser);
  }

  async function register(data: RegisterData) {
    const response = await api.post("/api/auth/register", data);
    const { token, user: newUser } = response.data;
    await saveSession(token, newUser);
    setUser(newUser);
  }

  async function logout() {
    await clearStorage();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
