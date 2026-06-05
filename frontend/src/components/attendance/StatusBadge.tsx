import {
  STATUS_BADGE_STYLES,
  type AttendanceStatusLabel,
} from "@/lib/attendanceUtils";

interface StatusBadgeProps {
  status: AttendanceStatusLabel | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style =
    STATUS_BADGE_STYLES[status as AttendanceStatusLabel] ??
    "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
