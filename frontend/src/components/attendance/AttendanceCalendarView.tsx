"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AttendanceCalendarCell from "@/components/attendance/AttendanceCalendarCell";
import AttendanceDayDetailPanel from "@/components/attendance/AttendanceDayDetailPanel";
import { LoadingState } from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { fetchAttendanceUsers, fetchEmployeeMonthlyAttendance } from "@/lib/attendanceService";
import {
  buildMonthGrid,
  CALENDAR_STATUS_COLORS,
  CALENDAR_STATUS_LEGEND,
  computeMonthlySummary,
  formatSummaryHours,
  MONTH_LABELS,
  type CalendarDayCell,
  WEEKDAY_LABELS,
} from "@/lib/attendanceCalendarUtils";
import { getRoleLabel } from "@/lib/navigation";
import type { AttendanceRecord } from "@/types/attendance";
import type { AssignableUser } from "@/types/lead";
import type { UserRole } from "@/types/user";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const ROLE_OPTIONS: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "All Roles" },
  { value: "CEO", label: "CEO" },
  { value: "SALES_HEAD", label: "Sales Head" },
  { value: "SALESPERSON", label: "Salesperson" },
];

interface AttendanceCalendarViewProps {
  refreshKey?: number;
  targetUserId?: string;
  /** When set, calendar is fixed to this employee (hides employee/role filters). */
  lockUserId?: string;
  employeeName?: string;
  embedded?: boolean;
}

export default function AttendanceCalendarView({
  refreshKey = 0,
  targetUserId,
  lockUserId,
  employeeName,
  embedded = false,
}: AttendanceCalendarViewProps) {
  const { user, isCEO, isSalesHead } = useAuth();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [selectedUserId, setSelectedUserId] = useState(user?.id ?? "");
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDayCell | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = lockUserId ?? selectedUserId;

  useEffect(() => {
    if (lockUserId) {
      setSelectedUserId(lockUserId);
      return;
    }
    if (targetUserId) {
      setSelectedUserId(targetUserId);
      return;
    }
    if (user?.id && !selectedUserId) {
      setSelectedUserId(user.id);
    }
  }, [user?.id, selectedUserId, targetUserId, lockUserId]);

  useEffect(() => {
    if (!isCEO && !isSalesHead) return;
    fetchAttendanceUsers()
      .then(setUsers)
      .catch(() => undefined);
  }, [isCEO, isSalesHead]);

  const filteredUsers = useMemo(() => {
    if (!roleFilter) return users;
    return users.filter((item) => item.role === roleFilter);
  }, [users, roleFilter]);

  useEffect(() => {
    if (lockUserId) return;
    if (!filteredUsers.some((item) => item.id === selectedUserId)) {
      const fallback = filteredUsers[0]?.id ?? user?.id ?? "";
      if (fallback) setSelectedUserId(fallback);
    }
  }, [filteredUsers, selectedUserId, user?.id, lockUserId]);

  const loadRecords = useCallback(async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEmployeeMonthlyAttendance(effectiveUserId, year, month);
      setRecords(data);
    } catch {
      setError("Unable to load attendance calendar.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, year, month, refreshKey]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const grid = useMemo(
    () => buildMonthGrid(year, month, records),
    [year, month, records],
  );
  const summary = useMemo(() => computeMonthlySummary(grid), [grid]);

  const selectedUser = filteredUsers.find((item) => item.id === effectiveUserId);
  const employeeLabel =
    employeeName ??
    (selectedUser
      ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim() ||
        selectedUser.username
      : user
        ? `${user.first_name} ${user.last_name}`.trim() || user.username
        : "Employee");

  const yearOptions = Array.from({ length: 5 }, (_, index) => now.getFullYear() - index);

  const showRoleFilter = isCEO && !lockUserId;
  const showEmployeeFilter = (isCEO || isSalesHead) && !lockUserId;

  return (
    <div className="space-y-4">
      <div
        className={
          embedded
            ? "rounded-lg border border-slate-200 bg-slate-50/50 p-3"
            : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        }
      >
        <div
          className={`grid gap-3 ${
            showRoleFilter && showEmployeeFilter
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : showEmployeeFilter
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2"
          }`}
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Month</label>
            <select
              className={inputClass}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Year</label>
            <select
              className={inputClass}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {showRoleFilter && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select
                className={inputClass}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as UserRole | "")}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showEmployeeFilter && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Employee</label>
              <select
                className={inputClass}
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {filteredUsers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.first_name} {item.last_name} ({getRoleLabel(item.role)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {!lockUserId && (
          <p className="mt-3 text-sm text-slate-500">
            Viewing calendar for{" "}
            <span className="font-medium text-slate-800">{employeeLabel}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-sm text-green-800">Present Days</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">{summary.presentDays}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm text-red-800">Absent Days</p>
          <p className="mt-1 text-2xl font-semibold text-red-900">{summary.absentDays}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Working Hours</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatSummaryHours(summary.totalWorkingHours)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {CALENDAR_STATUS_LEGEND.map((item) => (
          <div key={item.status} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className={`h-3 w-3 rounded border ${CALENDAR_STATUS_COLORS[item.status].split(" ").slice(0, 2).join(" ")}`}
            />
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-3 w-3 rounded border border-slate-200 bg-slate-50" />
          N/A
        </div>
      </div>

      {isLoading && <LoadingState message="Loading calendar..." />}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-1 py-2 text-center text-xs font-semibold uppercase text-slate-500 sm:px-2 sm:text-sm"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, index) => {
              if (!cell.inMonth) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[108px] border-b border-r border-slate-100 bg-slate-50/50 sm:min-h-[128px]"
                  />
                );
              }

              return (
                <AttendanceCalendarCell
                  key={cell.date}
                  cell={cell}
                  onClick={() => setSelectedDay(cell)}
                />
              );
            })}
          </div>
        </div>
      )}

      {selectedDay && (
        <AttendanceDayDetailPanel
          date={selectedDay.date}
          status={selectedDay.status}
          record={selectedDay.record}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
