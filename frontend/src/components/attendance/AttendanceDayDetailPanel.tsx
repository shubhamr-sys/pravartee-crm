"use client";

import LocationDisplay from "@/components/attendance/LocationDisplay";
import {
  CALENDAR_STATUS_COLORS,
  type CalendarDayStatus,
} from "@/lib/attendanceCalendarUtils";
import { formatWorkingHoursDisplay } from "@/lib/attendanceUtils";
import { formatDate, formatTime } from "@/lib/format";
import type { AttendanceRecord } from "@/types/attendance";

interface AttendanceDayDetailPanelProps {
  date: string;
  status: CalendarDayStatus;
  record: AttendanceRecord | null;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default function AttendanceDayDetailPanel({
  date,
  status,
  record,
  onClose,
}: AttendanceDayDetailPanelProps) {
  const statusStyle = CALENDAR_STATUS_COLORS[status];

  return (
    <>
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 z-[60] bg-slate-900/30 lg:bg-transparent"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Attendance Details</h2>
            <p className="text-sm text-slate-500">{formatDate(date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <DetailRow label="Attendance Status">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle}`}
            >
              {status}
            </span>
          </DetailRow>

          {status === "N/A" && (
            <p className="text-sm text-slate-500">This date is in the future.</p>
          )}

          {status === "Weekend" && (
            <p className="text-sm text-slate-500">Weekend — not counted as absent.</p>
          )}

          {status === "Holiday" && (
            <p className="text-sm text-slate-500">Public holiday.</p>
          )}

          {status === "Absent" && (
            <p className="text-sm text-slate-500">No attendance recorded for this day.</p>
          )}

          {status === "Present" && (
            <>
              <DetailRow label="Punch In Time">
                {formatTime(record?.punch_in_time ?? null)}
              </DetailRow>
              <DetailRow label="Punch Out Time">
                {formatTime(record?.punch_out_time ?? null)}
              </DetailRow>
              <DetailRow label="Working Hours">
                {record?.working_hours_display ??
                  formatWorkingHoursDisplay(record?.working_hours ?? null)}
              </DetailRow>
              <DetailRow label="Punch In GPS Location">
                <LocationDisplay
                  latitude={record?.punch_in_latitude}
                  longitude={record?.punch_in_longitude}
                  mapUrl={record?.punch_in_map_url}
                />
              </DetailRow>
              <DetailRow label="Punch Out GPS Location">
                <LocationDisplay
                  latitude={record?.punch_out_latitude}
                  longitude={record?.punch_out_longitude}
                  mapUrl={record?.punch_out_map_url}
                />
              </DetailRow>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
