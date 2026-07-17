"use client";

import { useState } from "react";

import VisitActivityTimeline from "@/components/visits/VisitActivityTimeline";
import type { FieldVisit } from "@/types/visit";

interface VisitTableProps {
  visits: FieldVisit[];
  showEmployee?: boolean;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitTable({ visits, showEmployee = false }: VisitTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {visits.map((visit) => {
        const isExpanded = expandedId === visit.id;
        const activities = [...(visit.activities ?? [])].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        return (
          <article
            key={visit.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid gap-3 px-4 py-4 md:grid-cols-6 md:items-start">
              <div className="md:col-span-2">
                <p className="font-medium text-slate-900">{visit.department_name}</p>
                {visit.purpose ? (
                  <p className="mt-0.5 text-xs text-slate-500">{visit.purpose}</p>
                ) : null}
                {showEmployee ? (
                  <p className="mt-1 text-xs text-slate-500">{visit.employee_name}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Contact</p>
                <p className="text-sm text-slate-800">{visit.contact_person || "—"}</p>
                {visit.designation ? (
                  <p className="text-xs text-slate-500">{visit.designation}</p>
                ) : null}
                {visit.mobile ? (
                  <p className="text-xs text-slate-500">{visit.mobile}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Check in</p>
                <p className="text-sm text-slate-800">{formatDateTime(visit.check_in_time)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Check out</p>
                <p className="text-sm text-slate-800">
                  {formatDateTime(visit.check_out_time)}
                </p>
                <p className="text-xs text-slate-500">
                  {visit.duration_hours != null ? `${visit.duration_hours} hrs` : "—"}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    visit.status === "IN_PROGRESS"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {visit.status_display}
                </span>
                {visit.check_in_map_url ? (
                  <a
                    href={visit.check_in_map_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-teal-700 hover:text-teal-800"
                  >
                    Map
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  {isExpanded ? "Hide activity" : "Activity timeline"}
                </button>
              </div>
            </div>
            {isExpanded ? (
              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Visit activity
                </h3>
                <VisitActivityTimeline activities={activities} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
