import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth";

const DEFAULT_BACKEND_PORT = "8084";

export function getBackendPort(): string {
  return process.env.NEXT_PUBLIC_BACKEND_PORT || DEFAULT_BACKEND_PORT;
}

export function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Same-origin requests hit Next.js rewrites → Django (works over HTTPS on LAN).
    if (process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API !== "false") {
      return window.location.origin;
    }
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${getBackendPort()}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:${getBackendPort()}`;
}

export const api = axios.create({
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = resolveApiBaseUrl();
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary; a bare "multipart/form-data" breaks uploads.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${resolveApiBaseUrl()}/api/v1/auth/refresh/`,
      { refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    setTokens(data.access, data.refresh ?? refresh);
    return data.access;
  } catch {
    clearAuth();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("/auth/login/") ||
      original.url?.includes("/auth/refresh/")
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const access = await refreshPromise;
    if (!access) {
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${access}`;
    return api(original);
  },
);
