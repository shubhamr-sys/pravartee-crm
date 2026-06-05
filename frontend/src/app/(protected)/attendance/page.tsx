"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AttendanceFilters from "@/components/attendance/AttendanceFilters";
import AttendanceSummaryCards from "@/components/attendance/AttendanceSummaryCards";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import PunchButtons from "@/components/attendance/PunchButtons";
import TodayStatus from "@/components/attendance/TodayStatus";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAttendance,
  fetchAttendanceSummary,
  fetchAttendanceUsers,
  fetchMyAttendance,
  getTodayRecord,
} from "@/lib/attendanceService";
import type { AttendanceMetrics, AttendanceRecord } from "@/types/attendance";
import type { AssignableUser } from "@/types/lead";

const PAGE_SIZE = 25;

export default function AttendancePage() {
  const { isCEO, isSalesHead } = useAuth();

  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [listRecords, setListRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceMetrics | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  const [date, setDate] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageTitle = isCEO
    ? "Attendance"
    : isSalesHead
      ? "Attendance"
      : "My Attendance";

  const pageDescription = isCEO
    ? "View and manage attendance for all employees."
    : isSalesHead
      ? "View your attendance and salesperson records."
      : "Track your daily punch in and punch out.";

  const todayRecord = getTodayRecord(myRecords);

  const loadMyAttendance = useCallback(async () => {
    const data = await fetchMyAttendance(1);
    setMyRecords(data.results);
  }, []);

  const loadSummary = useCallback(async () => {
    const data = await fetchAttendanceSummary();
    setSummary(data);
  }, []);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAttendance({
        page,
        attendance_date: date || undefined,
        user: userId || undefined,
        user__role: role || undefined,
        status: status || undefined,
      });
      setListRecords(data.results);
      setCount(data.count);
    } catch {
      setError("Unable to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  }, [page, date, role, userId, status]);

  useEffect(() => {
    Promise.all([loadMyAttendance(), loadSummary()]).catch(() => {
      setError("Unable to load today's attendance.");
    });
  }, [loadMyAttendance, loadSummary]);

  useEffect(() => {
    if (isCEO || isSalesHead) {
      fetchAttendanceUsers()
        .then(setUsers)
        .catch(() => undefined);
    }
  }, [isCEO, isSalesHead]);

  useEffect(() => {
    setPage(1);
  }, [date, role, userId, status]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function refreshAfterPunch() {
    await Promise.all([loadMyAttendance(), loadList(), loadSummary()]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
        </div>
        <Link
          href="/attendance/corrections"
          className="inline-flex items-center justify-center rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          Corrections
        </Link>
      </div>

      {summary?.pending_corrections_label && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {summary.pending_corrections_label}
        </div>
      )}

      <AttendanceSummaryCards
        metrics={summary}
        isCEO={isCEO}
        isSalesHead={isSalesHead}
      />

      <TodayStatus record={todayRecord ?? null} />
      <PunchButtons todayRecord={todayRecord ?? null} onSuccess={refreshAfterPunch} />

      <AttendanceFilters
        date={date}
        role={role}
        userId={userId}
        status={status}
        users={users}
        showRoleFilter={isCEO}
        showUserFilter={isCEO || isSalesHead}
        showStatusFilter={isCEO || isSalesHead}
        onDateChange={setDate}
        onRoleChange={setRole}
        onUserChange={setUserId}
        onStatusChange={setStatus}
      />

      {isLoading && <LoadingState message="Loading attendance..." />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={loadList} />
      )}

      {!isLoading && !error && listRecords.length === 0 && (
        <EmptyState message="No attendance records found." />
      )}

      {!isLoading && !error && listRecords.length > 0 && (
        <>
          <AttendanceTable records={listRecords} showRole={isCEO} />
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {listRecords.length} of {count} records
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
