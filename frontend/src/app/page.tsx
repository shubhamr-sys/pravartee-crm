"use client";

import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/lib/auth";

export default function HomePage() {
  const { sessionReady } = useAuth();

  useEffect(() => {
    if (!sessionReady) return;
    window.location.replace(isAuthenticated() ? "/dashboard" : "/login");
  }, [sessionReady]);

  // If auth bootstrap hangs (e.g. stale token), still reach login.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!sessionReady) {
        window.location.replace("/login");
      }
    }, 12_000);
    return () => clearTimeout(t);
  }, [sessionReady]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Redirecting...</p>
    </div>
  );
}
