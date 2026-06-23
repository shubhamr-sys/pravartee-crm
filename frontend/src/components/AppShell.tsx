"use client";

import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { getRoleLabel } from "@/lib/navigation";

import RoleNav from "./RoleNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Pravartee CRM</p>
            {user && (
              <p className="text-sm text-slate-500">
                {user.first_name} {user.last_name} · {getRoleLabel(user.role)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              href="/account/password"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Change password
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <RoleNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
