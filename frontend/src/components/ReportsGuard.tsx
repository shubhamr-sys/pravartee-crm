"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function ReportsGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { sessionReady, isCEO, isSalesHead } = useAuth();

  useEffect(() => {
    if (!sessionReady) return;
    if (!isCEO && !isSalesHead) {
      router.replace("/dashboard");
    }
  }, [sessionReady, isCEO, isSalesHead, router]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!isCEO && !isSalesHead) {
    return null;
  }

  return <>{children}</>;
}
