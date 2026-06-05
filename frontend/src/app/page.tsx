"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { isAuthenticated } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated() ? "/dashboard" : "/login");
  }, [isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Redirecting...</p>
    </div>
  );
}
