"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { defaultHomeForRole, isPathAllowedForRole } from "@/lib/roleAccess";

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
  const { sessionReady, isLoading, user, role } = useAuth();

  useEffect(() => {
    if (!sessionReady || isLoading) return;

    if (!user) {
      const next = encodeURIComponent(pathname);
      window.location.replace(`/login?next=${next}`);
      return;
    }

    if (!isPathAllowedForRole(pathname, role)) {
      window.location.replace(defaultHomeForRole(role));
    }
  }, [sessionReady, isLoading, user, role, pathname]);

  if (!sessionReady || isLoading || !user) {
    return <SessionLoading />;
  }

  return <>{children}</>;
}
