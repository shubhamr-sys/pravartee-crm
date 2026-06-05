"use client";

import { FormEvent, useState } from "react";
import { isAxiosError } from "axios";

import { createCorrection } from "@/lib/attendanceService";
import { CORRECTION_TYPE_OPTIONS } from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";

interface CorrectionRequestFormProps {
  records: AttendanceRecord[];
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function CorrectionRequestForm({
  records,
  onSuccess,
}: CorrectionRequestFormProps) {
  const [attendanceId, setAttendanceId] = useState("");
  const [correctionType, setCorrectionType] = useState("ACCIDENTAL_PUNCH_OUT");
  const [requestedPunchOut, setRequestedPunchOut] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const eligibleRecords = records.filter((record) => record.punch_in_time);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!attendanceId || !reason.trim()) {
      setError("Please select an attendance record and provide a reason.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        attendance: attendanceId,
        correction_type: correctionType,
        reason: reason.trim(),
        ...(correctionType === "MISSED_PUNCH_OUT" && requestedPunchOut
          ? { requested_punch_out_time: new Date(requestedPunchOut).toISOString() }
          : {}),
      };
      await createCorrection(payload);
      setSuccess("Correction request submitted. Status: Pending Approval.");
      setReason("");
      setRequestedPunchOut("");
      onSuccess();
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data;
        if (typeof data === "object" && data) {
          const first = Object.values(data)[0];
          setError(Array.isArray(first) ? String(first[0]) : "Request failed.");
        } else {
          setError("Request failed.");
        }
      } else {
        setError("Request failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (eligibleRecords.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Request Attendance Correction
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Submit a correction for accidental punch out, missed punch out, or other issues.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Attendance Date</label>
          <select
            className={inputClass}
            value={attendanceId}
            onChange={(e) => setAttendanceId(e.target.value)}
          >
            <option value="">Select date</option>
            {eligibleRecords.map((record) => (
              <option key={record.id} value={record.id}>
                {record.attendance_date} — {record.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Correction Type</label>
          <select
            className={inputClass}
            value={correctionType}
            onChange={(e) => setCorrectionType(e.target.value)}
          >
            {CORRECTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {correctionType === "MISSED_PUNCH_OUT" && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Requested Punch Out
            </label>
            <input
              type="datetime-local"
              className={inputClass}
              value={requestedPunchOut}
              onChange={(e) => setRequestedPunchOut(e.target.value)}
            />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Reason</label>
          <textarea
            rows={3}
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this correction is needed..."
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </section>
  );
}
