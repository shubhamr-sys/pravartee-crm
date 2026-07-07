"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AttendanceSummaryCards from "@/components/attendance/AttendanceSummaryCards";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { getRoleLabel } from "@/lib/navigation";
import type { DashboardSummary } from "@/types/dashboard";

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Pipeline Leads</p>
              <p className="mt-2 text-2xl font-semibold">
                {summary.pipeline_leads}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Product Quantity in Pipeline</p>
              <p className="mt-2 text-2xl font-semibold">
                {summary.products?.total_product_quantity ?? 0}
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

          {summary.followups && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Follow-ups</h2>
              <div
                className={`grid gap-4 ${
                  isCEO ? "sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                {isCEO ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Today&apos;s Follow-ups</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {summary.followups.today_followups}
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                      <p className="text-sm text-red-800">Overdue Follow-ups</p>
                      <p className="mt-2 text-2xl font-semibold text-red-900">
                        {summary.followups.overdue_followups}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Upcoming Follow-ups</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {summary.followups.upcoming_followups}
                      </p>
                    </div>
                  </>
                ) : isSalesHead ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">Team Follow-ups Today</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {summary.followups.today_followups}
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                      <p className="text-sm text-red-800">Overdue Follow-ups</p>
                      <p className="mt-2 text-2xl font-semibold text-red-900">
                        {summary.followups.overdue_followups}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">My Follow-ups Today</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {summary.followups.today_followups}
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                      <p className="text-sm text-red-800">Overdue Follow-ups</p>
                      <p className="mt-2 text-2xl font-semibold text-red-900">
                        {summary.followups.overdue_followups}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {summary.products && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Top 5 Products</h2>
                {summary.products.top_products.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No products in pipeline.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-2 py-2 font-medium">Product</th>
                          <th className="px-2 py-2 font-medium">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.products.top_products.map((row) => (
                          <tr key={row.product} className="border-b border-slate-100">
                            <td className="px-2 py-2">{row.product}</td>
                            <td className="px-2 py-2">{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Category-wise Quantity
                </h2>
                {summary.products.category_quantity.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No category quantity data.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-2 py-2 font-medium">Category</th>
                          <th className="px-2 py-2 font-medium">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.products.category_quantity.map((row) => (
                          <tr key={row.category} className="border-b border-slate-100">
                            <td className="px-2 py-2">{row.category}</td>
                            <td className="px-2 py-2">{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {summary.leads_by_stage.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Sales Funnel by Stage
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.leads_by_stage.map((item) => (
                  <div
                    key={item.stage__name}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{item.stage__name}</p>
                    <p className="mt-1 text-xl font-semibold">{item.count}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Upcoming Follow-ups
              </h2>
              {summary.upcoming_followups.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No follow-ups in the next 7 days.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {summary.upcoming_followups.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {lead.customer_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(lead.next_followup_date)} · {lead.stage_name}
                          {lead.assigned_to_name ? ` · ${lead.assigned_to_name}` : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Lead Updates
              </h2>
              {summary.recent_lead_updates.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No recent updates.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {summary.recent_lead_updates.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {lead.customer_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {lead.stage_name} · Updated {formatDateTime(lead.updated_at)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {summary.recent_activities && summary.recent_activities.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Lead Activities
              </h2>
              <ul className="mt-4 space-y-3">
                {summary.recent_activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        <Link
                          href={`/leads/${activity.lead}`}
                          className="text-teal-700 hover:text-teal-800"
                        >
                          {activity.lead_customer_name || "Lead"}
                          {activity.lead_company_name
                            ? ` · ${activity.lead_company_name}`
                            : ""}
                        </Link>
                        {" · "}
                        {activity.activity_label}
                      </p>
                      <time className="text-xs text-slate-500">
                        {formatDateTime(activity.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
                  </li>
                ))}
              </ul>
            </section>
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
