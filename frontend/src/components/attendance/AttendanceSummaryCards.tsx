"use client";

import StatusBadge from "@/components/attendance/StatusBadge";
import { formatWorkingHoursDisplay } from "@/lib/attendanceUtils";
import { formatTime } from "@/lib/format";
import type { AttendanceMetrics } from "@/types/attendance";

interface AttendanceSummaryCardsProps {
  metrics: AttendanceMetrics | null;
  isCEO: boolean;
  isSalesHead: boolean;
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function AttendanceSummaryCards({
  metrics,
  isCEO,
  isSalesHead,
}: AttendanceSummaryCardsProps) {
  if (!metrics) return null;

  if (isCEO && "present_today" in metrics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Present Today" value={metrics.present_today} />
        <SummaryCard label="Absent Today" value={metrics.absent_today} />
        <SummaryCard label="Total Employees" value={metrics.total_employees} />
        <SummaryCard
          label="Average Hours"
          value={
            metrics.average_working_hours_display ??
            formatWorkingHoursDisplay(metrics.average_working_hours)
          }
        />
      </div>
    );
  }

  if (isSalesHead && "team_present" in metrics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Team Present" value={metrics.team_present} />
        <SummaryCard label="Team Absent" value={metrics.team_absent} />
        <SummaryCard
          label="Team Members"
          value={metrics.team_members ?? metrics.team_present + metrics.team_absent}
        />
        <SummaryCard
          label="Average Hours"
          value={
            metrics.average_team_working_hours_display ??
            formatWorkingHoursDisplay(metrics.average_team_working_hours)
          }
        />
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
