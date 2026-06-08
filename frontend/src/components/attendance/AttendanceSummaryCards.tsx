"use client";

import StatusBadge from "@/components/attendance/StatusBadge";
import { formatWorkingHoursDisplay } from "@/lib/attendanceUtils";
import { formatTime } from "@/lib/format";
import { getRoleLabel } from "@/lib/navigation";
import type {
  AttendanceEmployeeSummary,
  AttendanceMetrics,
  AttendanceStatusView,
} from "@/types/attendance";

interface AttendanceSummaryCardsProps {
  metrics: AttendanceMetrics | null;
  isCEO: boolean;
  isSalesHead: boolean;
  interactive?: boolean;
  activeView?: AttendanceStatusView | null;
  onViewChange?: (view: AttendanceStatusView | null) => void;
}

function SummaryCard({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "rounded-xl border bg-white p-5 shadow-sm text-left transition",
    active
      ? "border-teal-600 ring-2 ring-teal-100"
      : "border-slate-200",
    onClick ? "cursor-pointer hover:border-teal-300 hover:shadow-md" : "",
  ].join(" ");

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <p className="text-sm text-slate-500">{label}</p>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function EmployeeStatusPanel({
  title,
  employees,
  emptyMessage,
}: {
  title: string;
  employees: AttendanceEmployeeSummary[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {employees.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {employees.map((employee) => (
            <li
              key={employee.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">{employee.name}</p>
                <p className="text-xs text-slate-500">
                  {getRoleLabel(employee.role as "CEO" | "SALES_HEAD" | "SALESPERSON")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <StatusBadge status={employee.status} />
                {employee.punch_in_time && (
                  <span>In: {formatTime(employee.punch_in_time)}</span>
                )}
                {employee.punch_out_time && (
                  <span>Out: {formatTime(employee.punch_out_time)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AttendanceSummaryCards({
  metrics,
  isCEO,
  isSalesHead,
  interactive = false,
  activeView = null,
  onViewChange,
}: AttendanceSummaryCardsProps) {
  if (!metrics) return null;

  function toggleView(view: AttendanceStatusView) {
    if (!interactive || !onViewChange) return;
    onViewChange(activeView === view ? null : view);
  }

  const presentEmployees =
    "present_employees" in metrics ? (metrics.present_employees ?? []) : [];
  const absentEmployees =
    "absent_employees" in metrics ? (metrics.absent_employees ?? []) : [];

  if (isCEO && "present_today" in metrics) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Present Today"
            value={metrics.present_today}
            active={activeView === "present"}
            onClick={
              interactive ? () => toggleView("present") : undefined
            }
          />
          <SummaryCard
            label="Absent Today"
            value={metrics.absent_today}
            active={activeView === "absent"}
            onClick={interactive ? () => toggleView("absent") : undefined}
          />
          <SummaryCard label="Total Employees" value={metrics.total_employees} />
          <SummaryCard
            label="Average Hours"
            value={
              metrics.average_working_hours_display ??
              formatWorkingHoursDisplay(metrics.average_working_hours)
            }
          />
        </div>

        {interactive && activeView === "present" && (
          <EmployeeStatusPanel
            title="Present Today"
            employees={presentEmployees}
            emptyMessage="No employees have punched in today."
          />
        )}
        {interactive && activeView === "absent" && (
          <EmployeeStatusPanel
            title="Absent Today"
            employees={absentEmployees}
            emptyMessage="Everyone has punched in today."
          />
        )}
      </div>
    );
  }

  if (isSalesHead && "team_present" in metrics) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Team Present"
            value={metrics.team_present}
            active={activeView === "present"}
            onClick={
              interactive ? () => toggleView("present") : undefined
            }
          />
          <SummaryCard
            label="Team Absent"
            value={metrics.team_absent}
            active={activeView === "absent"}
            onClick={interactive ? () => toggleView("absent") : undefined}
          />
          <SummaryCard
            label="Team Members"
            value={
              metrics.team_members ?? metrics.team_present + metrics.team_absent
            }
          />
          <SummaryCard
            label="Average Hours"
            value={
              metrics.average_team_working_hours_display ??
              formatWorkingHoursDisplay(metrics.average_team_working_hours)
            }
          />
        </div>

        {interactive && activeView === "present" && (
          <EmployeeStatusPanel
            title="Team Present Today"
            employees={presentEmployees}
            emptyMessage="No team members have punched in today."
          />
        )}
        {interactive && activeView === "absent" && (
          <EmployeeStatusPanel
            title="Team Absent Today"
            employees={absentEmployees}
            emptyMessage="All team members have punched in today."
          />
        )}
      </div>
    );
  }

  if ("today_status" in metrics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Today's Status"
          value={<StatusBadge status={metrics.today_status} />}
        />
        <SummaryCard
          label="Working Hours"
          value={
            metrics.working_hours_display ??
            formatWorkingHoursDisplay(metrics.working_hours)
          }
        />
      </div>
    );
  }

  return null;
}
