"use client";

import { useCallback, useEffect, useState } from "react";

import AttendanceCalendarView from "@/components/attendance/AttendanceCalendarView";
import EmployeeAttendanceSidePanel from "@/components/attendance/EmployeeAttendanceSidePanel";
import AttendanceFilters from "@/components/attendance/AttendanceFilters";
import AttendanceSummaryCards from "@/components/attendance/AttendanceSummaryCards";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import AttendanceViewToggle, {
  type AttendanceViewMode,
} from "@/components/attendance/AttendanceViewToggle";
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
import type {
  AttendanceEmployeeSummary,
  AttendanceMetrics,
  AttendanceRecord,
  AttendanceStatusView,
} from "@/types/attendance";
import type { AssignableUser } from "@/types/lead";

const PAGE_SIZE = 25;

function getLocalToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const { isCEO, isSalesHead } = useAuth();

  const [viewMode, setViewMode] = useState<AttendanceViewMode>("calendar");
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

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
  const [activeStatusView, setActiveStatusView] =
    useState<AttendanceStatusView | null>(null);
  const [selectedEmployee, setSelectedEmployee] =
    useState<AttendanceEmployeeSummary | null>(null);

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
    if (viewMode !== "table") return;
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
  }, [viewMode, page, date, role, userId, status]);

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
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function refreshAfterPunch() {
    await Promise.all([loadMyAttendance(), loadSummary()]);
    setCalendarRefreshKey((current) => current + 1);
    if (viewMode === "table") {
      await loadList();
    }
  }

  function handleStatusViewChange(view: AttendanceStatusView | null) {
    setActiveStatusView(view);
    if (!view) {
      setDate("");
      setStatus("");
      return;
    }

    if (view === "all") {
      setViewMode("calendar");
      setDate("");
      setRole("");
      setUserId("");
      setStatus("");
      return;
    }

    setViewMode("table");
    setDate(getLocalToday());
    setRole("");
    setUserId("");
    setStatus(view === "present" ? "punched_in" : "absent");
  }

  function handleEmployeeClick(employee: AttendanceEmployeeSummary) {
    setSelectedEmployee(employee);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
        </div>
        <AttendanceViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {(isCEO || isSalesHead) && (
        <AttendanceSummaryCards
          metrics={summary}
          isCEO={isCEO}
          isSalesHead={isSalesHead}
          interactive
          activeView={activeStatusView}
          onViewChange={handleStatusViewChange}
          onEmployeeClick={handleEmployeeClick}
        />
      )}

      <TodayStatus record={todayRecord ?? null} />
      <PunchButtons todayRecord={todayRecord ?? null} onSuccess={refreshAfterPunch} />

      {selectedEmployee && (
        <EmployeeAttendanceSidePanel
          employee={selectedEmployee}
          refreshKey={calendarRefreshKey}
          onClose={() => setSelectedEmployee(null)}
        />
      )}

      {viewMode === "calendar" ? (
        <AttendanceCalendarView refreshKey={calendarRefreshKey} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
