"use client";

import LocationDisplay from "@/components/attendance/LocationDisplay";
import StatusBadge from "@/components/attendance/StatusBadge";
import {
  formatWorkingHoursDisplay,
  getAttendanceStatus,
} from "@/lib/attendanceUtils";
import { formatTime } from "@/lib/format";
import type { AttendanceRecord } from "@/types/attendance";

interface TodayStatusProps {
  record: AttendanceRecord | null;
}

export default function TodayStatus({ record }: TodayStatusProps) {
  const status = getAttendanceStatus(record);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Status</h2>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Punch In
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {formatTime(record?.punch_in_time)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Punch Out
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {formatTime(record?.punch_out_time)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Working Hours
          </p>
          <p className="mt-1 text-sm text-slate-900">
            {record?.working_hours_display ??
              formatWorkingHoursDisplay(record?.working_hours)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Punch In Location
          </p>
          <div className="mt-1">
            <LocationDisplay
              latitude={record?.punch_in_latitude}
              longitude={record?.punch_in_longitude}
              mapUrl={record?.punch_in_map_url}
            />
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Punch Out Location
          </p>
          <div className="mt-1">
            <LocationDisplay
              latitude={record?.punch_out_latitude}
              longitude={record?.punch_out_longitude}
              mapUrl={record?.punch_out_map_url}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
