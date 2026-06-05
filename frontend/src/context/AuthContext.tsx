"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  clearAuth,
  getStoredUser,
  isAuthenticated,
  setUser as persistUser,
} from "@/lib/auth";
import {
  fetchCurrentUser,
  loginWithEmail,
  logoutUser,
} from "@/lib/authService";
import type { User, UserRole } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCEO: boolean;
  isSalesHead: boolean;
  isSalesperson: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    persistUser(currentUser);
    setUser(currentUser);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (!isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      const cached = getStoredUser();
      if (cached) {
        setUser(cached);
      }

      try {
        await refreshUser();
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginWithEmail(email, password);
      setUser(response.user);
      router.replace("/dashboard");
    },
    [router],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      isAuthenticated: Boolean(user),
      isCEO: user?.role === "CEO",
      isSalesHead: user?.role === "SALES_HEAD",
      isSalesperson: user?.role === "SALESPERSON",
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
