import { formatTime } from "@/lib/format";
import {
  formatWorkingHoursDisplay,
  getAttendanceStatus,
} from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";

export type CalendarDayStatus =
  | "Present"
  | "In Progress"
  | "Incomplete"
  | "Absent"
  | "Weekend"
  | "Holiday"
  | "N/A";

export interface CalendarDayCell {
  date: string;
  day: number;
  inMonth: boolean;
  status: CalendarDayStatus;
  punchRange: string;
  hoursLabel: string;
  record: AttendanceRecord | null;
}

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const CALENDAR_STATUS_COLORS: Record<CalendarDayStatus, string> = {
  Present: "bg-green-100 text-green-900 border-green-200",
  "In Progress": "bg-amber-100 text-amber-900 border-amber-200",
  Incomplete: "bg-orange-100 text-orange-900 border-orange-200",
  Absent: "bg-red-50 text-red-800 border-red-100",
  Weekend: "bg-slate-100 text-slate-500 border-slate-200",
  Holiday: "bg-blue-50 text-blue-800 border-blue-100",
  "N/A": "bg-slate-50 text-slate-400 border-slate-100",
};

export const CALENDAR_STATUS_LEGEND: { status: CalendarDayStatus; label: string }[] = [
  { status: "Present", label: "Present" },
  { status: "In Progress", label: "In Progress" },
  { status: "Incomplete", label: "Incomplete" },
  { status: "Absent", label: "Absent" },
  { status: "Weekend", label: "Weekend" },
  { status: "Holiday", label: "Holiday" },
];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isFutureDate(year: number, month: number, day: number): boolean {
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target > today;
}

function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

function resolveDayStatus(
  year: number,
  month: number,
  day: number,
  record: AttendanceRecord | null,
): CalendarDayStatus {
  if (isFutureDate(year, month, day)) return "N/A";
  if (isWeekend(year, month, day)) return "Weekend";
  if (!record) return "Absent";
  return getAttendanceStatus(record) as CalendarDayStatus;
}

function punchRangeLabel(record: AttendanceRecord | null): string {
  if (!record?.punch_in_time) return "—";
  const start = formatTime(record.punch_in_time);
  const end = record.punch_out_time ? formatTime(record.punch_out_time) : "—";
  return `${start} – ${end}`;
}

export function buildMonthGrid(
  year: number,
  month: number,
  records: AttendanceRecord[],
): CalendarDayCell[] {
  const recordsByDate = new Map(records.map((record) => [record.attendance_date, record]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({
      date: "",
      day: 0,
      inMonth: false,
      status: "N/A",
      punchRange: "",
      hoursLabel: "",
      record: null,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = dateKey(year, month, day);
    const record = recordsByDate.get(date) ?? null;
    const status = resolveDayStatus(year, month, day, record);
    cells.push({
      date,
      day,
      inMonth: true,
      status,
      punchRange: punchRangeLabel(record),
      hoursLabel:
        record?.working_hours_display ??
        formatWorkingHoursDisplay(record?.working_hours ?? null),
      record,
    });
  }

  return cells;
}

export function computeMonthlySummary(grid: CalendarDayCell[]): {
  presentDays: number;
  absentDays: number;
  totalWorkingHours: number;
} {
  let presentDays = 0;
  let absentDays = 0;
  let totalWorkingHours = 0;

  for (const cell of grid) {
    if (!cell.inMonth) continue;
    if (cell.status === "Present") {
      presentDays += 1;
      totalWorkingHours += Number(cell.record?.working_hours ?? 0);
    } else if (cell.status === "Absent") {
      absentDays += 1;
    }
  }

  return { presentDays, absentDays, totalWorkingHours };
}

export function formatSummaryHours(hours: number): string {
  return formatWorkingHoursDisplay(hours);
}
