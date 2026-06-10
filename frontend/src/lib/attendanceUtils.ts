import type { AttendanceRecord } from "@/types/attendance";

export type AttendanceStatusLabel =
  | "Present"
  | "In Progress"
  | "Incomplete"
  | "Absent";

export const STATUS_BADGE_STYLES: Record<AttendanceStatusLabel, string> = {
  Present: "bg-green-100 text-green-800 border-green-200",
  "In Progress": "bg-amber-100 text-amber-800 border-amber-200",
  Incomplete: "bg-orange-100 text-orange-800 border-orange-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
};

function localTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function getAttendanceStatus(
  record: AttendanceRecord | null,
): AttendanceStatusLabel {
  if (!record?.punch_in_time) return "Absent";
  if (!record.punch_out_time) {
    if (record.attendance_date && record.attendance_date < localTodayKey()) {
      return "Incomplete";
    }
    return "In Progress";
  }
  return "Present";
}

export function formatWorkingHoursDisplay(
  hours: string | number | null | undefined,
): string {
  if (hours === null || hours === undefined || hours === "") return "—";
  const totalMinutes = Math.round(Number(hours) * 60);
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;
  return `${hourPart}h ${minutePart}m`;
}

export function getGoogleMapsUrl(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
): string | null {
  if (latitude === null || latitude === undefined || latitude === "") return null;
  if (longitude === null || longitude === undefined || longitude === "") return null;
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}
