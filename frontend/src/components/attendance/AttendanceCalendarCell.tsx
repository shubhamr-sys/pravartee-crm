"use client";

import {
  CALENDAR_STATUS_COLORS,
  type CalendarDayCell,
} from "@/lib/attendanceCalendarUtils";

interface AttendanceCalendarCellProps {
  cell: CalendarDayCell;
  onClick: () => void;
}

export default function AttendanceCalendarCell({
  cell,
  onClick,
}: AttendanceCalendarCellProps) {
  const colorClass = CALENDAR_STATUS_COLORS[cell.status];
  const showDetails =
    cell.status !== "N/A" &&
    cell.status !== "Weekend" &&
    cell.status !== "Holiday";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[108px] flex-col border-b border-r border-slate-100 p-1.5 text-left transition hover:brightness-95 sm:min-h-[128px] sm:p-2 ${colorClass}`}
    >
      <div className="text-sm font-bold leading-none sm:text-base">{cell.day}</div>

      <div className="mt-1.5 text-[10px] font-semibold leading-tight sm:text-xs">
        {cell.status}
      </div>

      {showDetails && (
        <>
          <div className="mt-1 text-[9px] leading-tight opacity-90 sm:text-[11px]">
            {cell.punchRange}
          </div>
          <div className="mt-auto pt-1 text-[10px] font-medium leading-tight sm:text-xs">
            {cell.hoursLabel}
          </div>
        </>
      )}

      {!showDetails && cell.status !== "N/A" && (
        <div className="mt-auto pt-1 text-[10px] leading-tight opacity-80 sm:text-xs">—</div>
      )}
    </button>
  );
}
