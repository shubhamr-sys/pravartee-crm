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

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Redirecting...</p>
    </div>
  );
}
