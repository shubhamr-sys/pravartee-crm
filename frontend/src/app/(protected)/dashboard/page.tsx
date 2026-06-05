"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getRoleLabel } from "@/lib/navigation";

interface DashboardSummary {
  pipeline_value: string | number;
  total_active_leads: number;
  stale_leads_count: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const { data } = await api.get<DashboardSummary>(
          "/api/v1/dashboard/summary/",
        );
        setSummary(data);
      } catch {
        setError("Unable to load dashboard metrics.");
      }
    }

    loadSummary();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {user?.first_name}. You are signed in as{" "}
          {user ? getRoleLabel(user.role) : "User"}.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pipeline Value</p>
            <p className="mt-2 text-2xl font-semibold">
              ₹{Number(summary.pipeline_value).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Leads</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.total_active_leads}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Stale Leads</p>
            <p className="mt-2 text-2xl font-semibold">
              {summary.stale_leads_count}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Lead Management UI will be built on this authenticated shell next.
      </div>
    </div>
  );
}
