"use client";

import { useEffect, useState } from "react";

import { LoadingState } from "@/components/leads/StatusMessage";
import { formatDate } from "@/lib/format";
import { fetchLeadStageHistory } from "@/lib/followupService";
import type { StageHistoryEntry } from "@/types/followup";

interface LeadStageHistoryTimelineProps {
  leadId: string;
}

export default function LeadStageHistoryTimeline({
  leadId,
}: LeadStageHistoryTimelineProps) {
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchLeadStageHistory(leadId);
        setHistory(data);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [leadId]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Stage History</h2>
      {isLoading && <LoadingState message="Loading stage history..." />}
      {!isLoading && history.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No stage changes recorded yet.</p>
      )}
      {!isLoading && history.length > 0 && (
        <ul className="mt-4 space-y-4">
          {history.map((entry) => (
            <li key={entry.id} className="border-l-2 border-teal-200 pl-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {formatDate(entry.changed_at)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">Stage Changed</p>
              <p className="text-sm text-slate-700">
                {entry.old_stage || "—"} → {entry.new_stage}
              </p>
              {entry.changed_by_name && (
                <p className="mt-1 text-xs text-slate-500">by {entry.changed_by_name}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
