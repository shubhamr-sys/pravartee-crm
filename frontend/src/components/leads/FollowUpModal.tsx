"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { FOLLOW_UP_TYPE_OPTIONS, type FollowUp, type FollowUpFormData } from "@/types/followup";
import type { AssignableUser } from "@/types/lead";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

interface FollowUpModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  users: AssignableUser[];
  initial?: FollowUp | null;
  defaultAssignedTo?: string;
  onClose: () => void;
  onSubmit: (values: FollowUpFormData) => Promise<void>;
}

export default function FollowUpModal({
  isOpen,
  isSubmitting = false,
  users,
  initial = null,
  defaultAssignedTo = "",
  onClose,
  onSubmit,
}: FollowUpModalProps) {
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<FollowUpFormData>({
    assigned_to: defaultAssignedTo,
    followup_date: "",
    followup_type: "CALL",
    remarks: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      assigned_to: initial?.assigned_to ?? defaultAssignedTo,
      followup_date: initial?.followup_date ?? "",
      followup_type: initial?.followup_type ?? "CALL",
      remarks: initial?.remarks ?? "",
    });
    setError(null);
  }, [isOpen, initial, defaultAssignedTo]);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.followup_date) {
      setError("Follow-up date is required.");
      return;
    }
    if (!values.assigned_to) {
      setError("Assigned user is required.");
      return;
    }
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch {
      setError("Unable to save follow-up.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {initial ? "Edit Follow-up" : "Add Follow-up"}
        </h2>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Follow-up Date *
            </label>
            <input
              type="date"
              className={inputClass}
              value={values.followup_date}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  followup_date: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              className={inputClass}
              value={values.followup_type}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  followup_type: event.target.value as FollowUpFormData["followup_type"],
                }))
              }
            >
              {FOLLOW_UP_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Assigned To *
            </label>
            <select
              className={inputClass}
              value={values.assigned_to}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  assigned_to: event.target.value,
                }))
              }
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              className={inputClass}
              rows={3}
              value={values.remarks}
              onChange={(event) =>
                setValues((current) => ({ ...current, remarks: event.target.value }))
              }
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : initial ? "Update" : "Add Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
