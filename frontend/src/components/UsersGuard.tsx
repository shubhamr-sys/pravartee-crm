"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function UsersGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { sessionReady, isCEO } = useAuth();

  useEffect(() => {
    if (!sessionReady) return;
    if (!isCEO) {
      router.replace("/dashboard");
    }
  }, [sessionReady, isCEO, router]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!isCEO) return null;

  return <>{children}</>;
}
