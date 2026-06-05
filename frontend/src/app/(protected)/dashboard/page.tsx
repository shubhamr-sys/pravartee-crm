"use client";

import { useEffect, useState } from "react";

import AttendanceSummaryCards from "@/components/attendance/AttendanceSummaryCards";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { getRoleLabel } from "@/lib/navigation";
import type { AttendanceMetrics } from "@/types/attendance";

interface DashboardSummary {
  pipeline_value: string | number;
  total_active_leads: number;
  stale_leads_count: number;
  attendance?: AttendanceMetrics;
}

export default function DashboardPage() {
  const { user, isCEO, isSalesHead } = useAuth();
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

  const attendance = summary?.attendance;
  const salespersonMetrics =
    attendance && "today_status" in attendance ? attendance : null;

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
        <>
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

          {attendance && "pending_corrections_label" in attendance && attendance.pending_corrections_label && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {attendance.pending_corrections_label}
            </div>
          )}

          {attendance && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Attendance</h2>
              <AttendanceSummaryCards
                metrics={attendance}
                isCEO={isCEO}
                isSalesHead={isSalesHead}
              />
              {salespersonMetrics && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Punch In Time</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatTime(salespersonMetrics.punch_in_time)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Punch Out Time</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {formatTime(salespersonMetrics.punch_out_time)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
