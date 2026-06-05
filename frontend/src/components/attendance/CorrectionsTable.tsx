"use client";

import { useState } from "react";

import {
  approveCorrection,
  rejectCorrection,
} from "@/lib/attendanceService";
import { formatDate, formatDateTime } from "@/lib/format";
import type { AttendanceCorrection } from "@/types/attendance";

interface CorrectionsTableProps {
  corrections: AttendanceCorrection[];
  onActionComplete: () => void;
}

function correctionStatusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

export default function CorrectionsTable({
  corrections,
  onActionComplete,
}: CorrectionsTableProps) {
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setActingId(id);
    setError(null);
    try {
      await approveCorrection(id);
      onActionComplete();
    } catch {
      setError("Unable to approve request.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Rejection reason (optional):") ?? "";
    setActingId(id);
    setError(null);
    try {
      await rejectCorrection(id, reason);
      onActionComplete();
    } catch {
      setError("Unable to reject request.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {corrections.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(item.attendance_date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.employee_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.correction_type_label}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.reason}</td>
                  <td className="px-4 py-3">
                    {correctionStatusBadge(item.status)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "PENDING" && item.can_approve ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => handleApprove(item.id)}
                          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => handleReject(item.id)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
