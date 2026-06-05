"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AttendanceTimeline from "@/components/attendance/AttendanceTimeline";
import CorrectionRequestForm from "@/components/attendance/CorrectionRequestForm";
import CorrectionsTable from "@/components/attendance/CorrectionsTable";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/leads/StatusMessage";
import {
  fetchAttendanceActivities,
  fetchCorrections,
  fetchMyAttendance,
} from "@/lib/attendanceService";
import type { AttendanceActivity, AttendanceCorrection, AttendanceRecord } from "@/types/attendance";

export default function AttendanceCorrectionsPage() {
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<AttendanceActivity[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [correctionData, myData] = await Promise.all([
        fetchCorrections(statusFilter || undefined),
        fetchMyAttendance(),
      ]);
      setCorrections(correctionData.results);
      setMyRecords(myData.results);

      const latestRecord = myData.results[0];
      if (latestRecord) {
        const timeline = await fetchAttendanceActivities(latestRecord.id);
        setActivities(timeline);
      }
    } catch {
      setError("Unable to load correction requests.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/attendance" className="text-sm text-teal-700 hover:text-teal-800">
          ← Back to Attendance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Attendance Corrections
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Request corrections or review pending approval requests.
        </p>
      </div>

      <CorrectionRequestForm records={myRecords} onSuccess={loadData} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Filter by status</label>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading && <LoadingState message="Loading corrections..." />}
      {!isLoading && error && <ErrorState message={error} onRetry={loadData} />}
      {!isLoading && !error && corrections.length === 0 && (
        <EmptyState message="No correction requests found." />
      )}
      {!isLoading && !error && corrections.length > 0 && (
        <CorrectionsTable corrections={corrections} onActionComplete={loadData} />
      )}

      <AttendanceTimeline activities={activities} />
    </div>
  );
}
