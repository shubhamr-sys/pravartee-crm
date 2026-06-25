import axios from "axios";

import { api, resolveApiBaseUrl } from "@/lib/api";
import { clearAuth, setTokens, setUser } from "@/lib/auth";
import type { LoginResponse, User } from "@/types/user";

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login/", {
    email,
    password,
  });
  setTokens(data.access, data.refresh);
  setUser(data.user);
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/api/v1/auth/me/");
  return data;
}

export async function logoutUser(): Promise<void> {
  const refresh = typeof window !== "undefined"
    ? localStorage.getItem("crm_refresh_token")
    : null;
  try {
    if (refresh) {
      await api.post("/api/v1/auth/logout/", { refresh });
    }
  } catch {
    // Clear local session even if blacklist fails.
  } finally {
    clearAuth();
  }
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    "/api/v1/auth/change-password/",
    payload,
  );
  return data;
}

export async function requestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  const { data } = await axios.post<{ message: string }>(
    `${resolveApiBaseUrl()}/api/v1/auth/forgot-password/`,
    { email },
  );
  return data;
}

export async function resetPasswordWithToken(payload: {
  token: string;
  new_password: string;
  confirm_password: string;
}): Promise<{ message: string }> {
  const { data } = await axios.post<{ message: string }>(
    `${resolveApiBaseUrl()}/api/v1/auth/reset-password/`,
    payload,
  );
  return data;
}
