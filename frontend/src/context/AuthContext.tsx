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
import { defaultHomeForRole } from "@/lib/roleAccess";

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  sessionReady: boolean;
  isAuthenticated: boolean;
  isCEO: boolean;
  isSalesHead: boolean;
  isSalesperson: boolean;
  isCommercial: boolean;
  canCreateMaster: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    persistUser(currentUser);
    setUser(currentUser);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!isAuthenticated()) {
        if (active) setSessionReady(true);
        return;
      }

      if (active) setIsLoading(true);

      const cached = getStoredUser();
      if (cached && active) {
        setUser(cached);
      }

      try {
        await Promise.race([
          refreshUser(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Session check timed out")), 8_000);
          }),
        ]);
      } catch {
        clearAuth();
        if (active) setUser(null);
      } finally {
        if (active) {
          setIsLoading(false);
          setSessionReady(true);
        }
      }
    }

    bootstrap();

    const failsafe = setTimeout(() => {
      if (active) {
        setIsLoading(false);
        setSessionReady(true);
      }
    }, 10_000);

    return () => {
      active = false;
      clearTimeout(failsafe);
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginWithEmail(email, password);
    setUser(response.user);
    setSessionReady(true);
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    window.location.replace(
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : defaultHomeForRole(response.user.role),
    );
  }, []);

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
      sessionReady,
      isAuthenticated: Boolean(user),
      isCEO: user?.role === "CEO",
      isSalesHead: user?.role === "SALES_HEAD",
      isSalesperson: user?.role === "SALESPERSON",
      isCommercial: user?.role === "COMMERCIAL",
      canCreateMaster:
        user?.role === "CEO" ||
        user?.role === "SALES_HEAD" ||
        user?.role === "SALESPERSON",
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, sessionReady, login, logout, refreshUser],
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
