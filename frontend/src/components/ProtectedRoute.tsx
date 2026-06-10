"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Loading session...</p>
    </div>
  );
}

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { sessionReady, isLoading, user } = useAuth();

  useEffect(() => {
    if (!sessionReady || isLoading) return;

    if (!user) {
      const next = encodeURIComponent(pathname);
      window.location.replace(`/login?next=${next}`);
    }
  }, [sessionReady, isLoading, user, pathname]);

  if (!sessionReady || isLoading || !user) {
    return <SessionLoading />;
  }

  return <>{children}</>;
}
