"use client";

import { useCallback, useEffect, useState } from "react";

import FollowUpCompleteModal from "@/components/leads/FollowUpCompleteModal";
import FollowUpModal from "@/components/leads/FollowUpModal";
import { LoadingState } from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/format";
import {
  completeFollowUp,
  createFollowUp,
  fetchLeadFollowUps,
} from "@/lib/followupService";
import { fetchAssignableUsers } from "@/lib/leadsService";
import type { FollowUp, FollowUpCompleteData } from "@/types/followup";
import type { AssignableUser } from "@/types/lead";

interface LeadFollowUpsSectionProps {
  leadId: string;
  defaultAssignedTo?: string;
  readOnly?: boolean;
  onUpdated?: () => void;
}

function statusClass(status: string): string {
  if (status === "COMPLETED") return "bg-green-100 text-green-800";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-800";
}

export default function LeadFollowUpsSection({
  leadId,
  defaultAssignedTo = "",
  readOnly = false,
  onUpdated,
}: LeadFollowUpsSectionProps) {
  const { user } = useAuth();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completing, setCompleting] = useState<FollowUp | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [followupData, userData] = await Promise.all([
        fetchLeadFollowUps(leadId),
        fetchAssignableUsers().catch(() => []),
      ]);
      setFollowups(followupData);
      if (userData.length > 0) {
        setUsers(userData);
      } else if (user) {
        setUsers([
          {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
          },
        ]);
      } else {
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSave(values: Parameters<typeof createFollowUp>[1]) {
    setIsSubmitting(true);
    try {
      await createFollowUp(leadId, values);
      await loadData();
      onUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleComplete(values: FollowUpCompleteData) {
    if (!completing) return;
    setIsSubmitting(true);
    try {
      await completeFollowUp(leadId, completing.id, values);
      await loadData();
      onUpdated?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasPending = followups.some((followup) => followup.status === "PENDING");
  const showActions = hasPending && !readOnly;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Follow-ups</h2>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            Add Follow-up
          </button>
        )}
      </div>

      {isLoading && <LoadingState message="Loading follow-ups..." />}

      {!isLoading && followups.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">No follow-ups scheduled.</p>
      )}

      {!isLoading && followups.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Assigned To</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                <th className="px-3 py-2 font-medium">Action Taken</th>
                {showActions && (
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {followups.map((followup) => (
                <tr key={followup.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{formatDate(followup.followup_date)}</td>
                  <td className="px-3 py-2">{followup.followup_type_display}</td>
                  <td className="px-3 py-2">{followup.assigned_to_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(followup.status)}`}
                    >
                      {followup.status_display}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{followup.remarks || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {followup.action_taken || "—"}
                  </td>
                  {showActions && (
                    <td className="px-3 py-2 text-right">
                      {followup.status === "PENDING" ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setCompleting(followup);
                            setCompleteModalOpen(true);
                          }}
                          className="rounded-lg border border-green-600 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                        >
                          Complete
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FollowUpModal
        isOpen={modalOpen}
        isSubmitting={isSubmitting}
        users={users}
        defaultAssignedTo={defaultAssignedTo}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      />

      <FollowUpCompleteModal
        isOpen={completeModalOpen}
        followup={completing}
        isSubmitting={isSubmitting}
        onClose={() => {
          setCompleteModalOpen(false);
          setCompleting(null);
        }}
        onSubmit={handleComplete}
      />
    </section>
  );
}
