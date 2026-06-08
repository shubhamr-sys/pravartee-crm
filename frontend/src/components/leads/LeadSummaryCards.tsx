"use client";

import { formatCurrency } from "@/lib/format";
import type { LeadListSummary } from "@/types/lead";

interface LeadSummaryCardsProps {
  summary: LeadListSummary | null;
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function LeadSummaryCards({ summary }: LeadSummaryCardsProps) {
  if (!summary) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Total Leads" value={summary.total_leads} />
      <SummaryCard
        label="Pipeline Value"
        value={formatCurrency(summary.pipeline_value)}
      />
      <SummaryCard label="Upcoming Follow-ups" value={summary.upcoming_followups} />
      <SummaryCard
        label="Overdue Follow-ups"
        value={
          <span className={summary.overdue_followups > 0 ? "text-red-700" : undefined}>
            {summary.overdue_followups}
          </span>
        }
      />
    </div>
  );
}
