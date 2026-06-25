"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { FollowUp, FollowUpCompleteData } from "@/types/followup";
import { formatDate } from "@/lib/format";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

/** Teal primary — bg-teal-700 is in the Tailwind bundle; inline color guards against missing utilities. */
const submitButtonStyle = { backgroundColor: "#0f766e", color: "#ffffff" } as const;

interface FollowUpCompleteModalProps {
  isOpen: boolean;
  followup: FollowUp | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: FollowUpCompleteData) => Promise<void>;
}

export default function FollowUpCompleteModal({
  isOpen,
  followup,
  isSubmitting = false,
  onClose,
  onSubmit,
}: FollowUpCompleteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !followup) return;
    setRemarks(followup.remarks ?? "");
    setActionTaken("");
    setError(null);
  }, [isOpen, followup]);

  if (!isOpen || !followup || !mounted) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!remarks.trim()) {
      setError("Remarks are required to complete this follow-up.");
      return;
    }
    if (!actionTaken.trim()) {
      setError("Action taken is required to complete this follow-up.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        remarks: remarks.trim(),
        action_taken: actionTaken.trim(),
      });
      onClose();
    } catch {
      setError("Unable to complete follow-up.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
      <div className="my-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Complete Follow-up</h2>
        <p className="mt-1 text-sm text-slate-500">
          {followup.followup_type_display} · {formatDate(followup.followup_date)}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Action Taken *
            </label>
            <textarea
              className={inputClass}
              rows={3}
              value={actionTaken}
              onChange={(event) => setActionTaken(event.target.value)}
              placeholder="What did you do? e.g. Called customer, discussed pricing..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Remarks *
            </label>
            <textarea
              className={inputClass}
              rows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Outcome, next steps, or additional notes..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              style={submitButtonStyle}
            >
              {isSubmitting ? "Saving..." : "Mark Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
